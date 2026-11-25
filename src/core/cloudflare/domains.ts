import "server-only";
import { REVERSE_PROXY_CONTAINER_NAME } from "~/core/docker/containers";
import { findZone } from "~/core/domains";
import { createQueue } from "~/core/queue";
import { getSharedState } from "~/core/shared-state";
import db from "~/database";
import type { CloudflareTunnel } from "~/models/cloudflare";
import type { DnsRecordDTO } from "~/models/dns-record";
import forgetDnsRecord from "~/operations/deleteDnsRecord";
import getCloudflareTunnel from "~/operations/getCloudflareTunnel";
import getDashboardDomain from "~/operations/getDashboardDomain";
import getDnsRecords from "~/operations/getDnsRecords";
import getDomains from "~/operations/getDomains";
import saveDnsRecord from "~/operations/saveDnsRecord";
import { cloudflareFetch } from "./client";
import { getConnectionState } from "./connection";
import { isCloudflareApiError, isCloudflareConnectionError } from "./errors";
import {
  createTunnelRecord,
  deleteRecord,
  describeRecords,
  findAddressRecords,
  isTunnelRecord,
  isUnsavedRecord,
  replaceWithTunnelRecord,
  updateTunnelRecord,
} from "./records";
import { type CloudflareZone, getZones } from "./zones";

export type DomainFailureReason = NonNullable<DnsRecordDTO["failure"]>;

export type SyncOptions = {
  /** Also checks the records that were in sync before, they may have been changed in Cloudflare */
  verify?: boolean,
  /** The service whose domains are treated as if they were removed */
  withoutService?: string,
  /** The hostname that may be taken over, and the description of the records that the user agreed to replace */
  takeover?: { hostname: string, records: string },
};

const TOO_MANY_REQUESTS = 429;
const SERVER_ERROR = 500;

const MIN_RETRY_DELAY = 60_000;
const MAX_RETRY_DELAY = 30 * 60_000;

/** Shared with the tunnel, which must not be replaced or deleted in the meantime */
const enqueue = createQueue("cloudflare-tunnel-queue");

type Retry = { timer: NodeJS.Timeout | null, attempts: number };

const retry = getSharedState<Retry>("cloudflare-domains-retry", () => ({ timer: null, attempts: 0 }));

class DomainFailure extends Error {
  readonly reason: DomainFailureReason;
  readonly details: string | null;

  constructor(reason: DomainFailureReason, details: string | null = null) {
    super(details === null ? reason : `${reason}: ${details}`);
    this.name = "DomainFailure";
    this.reason = reason;
    this.details = details;
  }
}

function toDomainFailure(error: unknown): DomainFailure {
  if (error instanceof DomainFailure) return error;
  if (isCloudflareConnectionError(error)) return new DomainFailure("connection_lost");
  if (isCloudflareApiError(error) && error.status < SERVER_ERROR && error.status !== TOO_MANY_REQUESTS) {
    return new DomainFailure("rejected", error.message);
  }
  return new DomainFailure("unreachable");
}

/** The other requests would fail too */
function isOutage({ reason }: DomainFailure) {
  return reason === "unreachable" || reason === "connection_lost";
}

/** The others can only be solved by the user */
function isTransient({ reason }: DomainFailure) {
  return reason === "unreachable" || reason === "rejected";
}

function isInSync(record: DnsRecordDTO | undefined, tunnelId: string) {
  return record !== undefined && record.recordId !== null && record.tunnelId === tunnelId && record.failure === null;
}

async function getDesiredHostnames(withoutService?: string) {
  const [
    domains,
    dashboardHostname,
  ] = await Promise.all([
    getDomains(db),
    getDashboardDomain(db),
  ]);
  const hostnames = domains.filter(({ serviceId }) => serviceId !== withoutService).map(({ hostname }) => hostname);
  return dashboardHostname === null ? hostnames : [dashboardHostname, ...hostnames];
}

/** Replaces the whole list. Nginx finds the service by the hostname, everything else gets a 404. */
async function saveIngressRules({ accountId, id }: CloudflareTunnel, hostnames: string[]) {
  await cloudflareFetch(`/accounts/${accountId}/cfd_tunnel/${id}/configurations`, {
    method: "PUT",
    body: JSON.stringify({
      config: {
        ingress: [
          ...hostnames.map(hostname => ({ hostname, service: `http://${REVERSE_PROXY_CONTAINER_NAME}:80` })),
          { service: "http_status:404" },
        ],
      },
    }),
  });
}

async function ensureRecord(
  hostname: string,
  zones: CloudflareZone[],
  tunnelId: string,
  saved: DnsRecordDTO | undefined,
  takeover: SyncOptions["takeover"],
) {
  const zone = findZone(hostname, zones);
  if (!zone) throw new DomainFailure("no_zone");
  // A more specific zone may have been added to the account
  if (saved?.recordId && saved.zoneId && saved.zoneId !== zone.id) await deleteRecord(saved.zoneId, saved.recordId);

  const existing = await findAddressRecords(zone.id, hostname);
  const own = existing.find(({ id }) => id === saved?.recordId) ??
    existing.find(record => isUnsavedRecord(record, tunnelId));
  if (own) {
    if (!isTunnelRecord(own, tunnelId)) await updateTunnelRecord(zone.id, own.id, hostname, tunnelId);
    return { zoneId: zone.id, recordId: own.id };
  }
  if (existing.length === 0) return { zoneId: zone.id, recordId: await createTunnelRecord(zone.id, hostname, tunnelId) };

  const description = describeRecords(existing);
  if (takeover?.hostname !== hostname || takeover.records !== description) throw new DomainFailure("taken", description);
  return { zoneId: zone.id, recordId: await replaceWithTunnelRecord(zone.id, existing, hostname, tunnelId) };
}

/** Returns false if it should be tried again later */
async function sync({ verify = false, withoutService, takeover }: SyncOptions) {
  const tunnel = await getCloudflareTunnel(db);
  if (!tunnel?.token || await getConnectionState() === "disconnected") return true;

  const [
    hostnames,
    savedRecords,
  ] = await Promise.all([
    getDesiredHostnames(withoutService),
    getDnsRecords(db),
  ]);
  const saved = new Map(savedRecords.map(record => [record.hostname, record]));
  // Nothing else is tried after a blocker
  const progress: { isComplete: boolean, blocker: DomainFailure | null } = { isComplete: true, blocker: null };

  const fail = async (hostname: string, failure: DomainFailure) => {
    if (isTransient(failure)) progress.isComplete = false;
    // The domains that are in sync still work while Cloudflare can't be reached
    if (isOutage(failure) && hostnames.includes(hostname) && isInSync(saved.get(hostname), tunnel.id)) return;
    await saveDnsRecord(db, { hostname, failure: failure.reason, failureDetails: failure.details });
  };

  const attempt = async (hostname: string, task: () => Promise<void>) => {
    if (progress.blocker) {
      await fail(hostname, progress.blocker);
      return;
    }
    try {
      await task();
    } catch (error) {
      const failure = toDomainFailure(error);
      // eslint-disable-next-line no-console
      console.error(`Failed to sync ${hostname} with Cloudflare:`, error);
      if (isOutage(failure)) progress.blocker = failure;
      await fail(hostname, failure);
    }
  };

  // A hostname must not be public longer than it's served
  for (const { hostname, zoneId, recordId } of savedRecords) {
    if (hostnames.includes(hostname)) continue;
    await attempt(hostname, async () => {
      if (zoneId !== null && recordId !== null) await deleteRecord(zoneId, recordId);
      await forgetDnsRecord(db, hostname);
    });
  }

  let zones: CloudflareZone[] = [];
  const pendingHostnames = hostnames.filter(hostname => verify || !isInSync(saved.get(hostname), tunnel.id));
  if (!progress.blocker) {
    try {
      await saveIngressRules(tunnel, hostnames);
      // The tunnel can't serve the zones of other accounts
      if (pendingHostnames.length > 0) zones = (await getZones()).filter(zone => zone.accountId === tunnel.accountId);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to sync the tunnel with the domains:", error);
      progress.blocker = toDomainFailure(error);
      if (isTransient(progress.blocker)) progress.isComplete = false;
    }
  }

  for (const hostname of pendingHostnames) {
    await attempt(hostname, async () => {
      const { zoneId, recordId } = await ensureRecord(hostname, zones, tunnel.id, saved.get(hostname), takeover);
      await saveDnsRecord(db, {
        hostname,
        zoneId,
        recordId,
        tunnelId: tunnel.id,
        failure: null,
        failureDetails: null,
      });
    });
  }
  return progress.isComplete;
}

function scheduleRetry(isNeeded: boolean) {
  if (retry.timer) clearTimeout(retry.timer);
  retry.timer = null;
  if (!isNeeded) {
    retry.attempts = 0;
    return;
  }
  const delay = Math.min(MIN_RETRY_DELAY * (2 ** retry.attempts), MAX_RETRY_DELAY);
  retry.attempts++;
  retry.timer = setTimeout(() => {
    void syncDomains({ verify: true });
  }, delay);
  retry.timer.unref();
}

/**
 * Makes Cloudflare match the domains in SQLite: first the records of the domains that are gone, then the tunnel, and
 * then the records of the domains. It never throws, what couldn't be done is saved with the reason and tried again.
 */
export function syncDomains(options: SyncOptions = {}): Promise<void> {
  // The domains may have changed while waiting for other changes
  return enqueue(async () => {
    try {
      scheduleRetry(!await sync(options));
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to sync the domains with Cloudflare:", error);
      scheduleRetry(true);
    }
  });
}

export type DomainStatus = {
  state: "active" | "pending" | "failed" | "disconnected",
  failure: DomainFailureReason | null,
  details: string | null,
};

async function getSyncState() {
  const [
    tunnel,
    records,
  ] = await Promise.all([
    getCloudflareTunnel(db),
    getDnsRecords(db),
  ]);
  return { tunnelId: tunnel?.token ? tunnel.id : null, records };
}

/** Returns the statuses in the order of the hostnames */
export async function getDomainStatuses(hostnames: string[]): Promise<DomainStatus[]> {
  const { tunnelId, records } = await getSyncState();
  return hostnames.map(hostname => {
    const record = records.find(item => item.hostname === hostname);
    if (tunnelId === null) return { state: "disconnected", failure: null, details: null };
    if (record?.failure) return { state: "failed", failure: record.failure, details: record.failureDetails };
    return { state: isInSync(record, tunnelId) ? "active" : "pending", failure: null, details: null };
  });
}

/** Returns the hostnames that are not domains anymore, but still have a DNS record */
export async function getLeftoverHostnames() {
  const [
    { tunnelId, records },
    hostnames,
  ] = await Promise.all([
    getSyncState(),
    getDesiredHostnames(),
  ]);
  if (tunnelId === null) return [];
  return records
    .filter(({ hostname, recordId }) => recordId !== null && !hostnames.includes(hostname))
    .map(({ hostname }) => hostname);
}

/** Returns the zones that a domain can be added to, or null if there is no tunnel */
export async function getDomainZones(): Promise<CloudflareZone[] | null> {
  const tunnel = await getCloudflareTunnel(db);
  if (!tunnel?.token) return null;
  return (await getZones()).filter(({ accountId }) => accountId === tunnel.accountId);
}
