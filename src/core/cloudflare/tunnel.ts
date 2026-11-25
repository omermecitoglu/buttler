import "server-only";
import crypto from "node:crypto";
import { removeTunnelContainer, startTunnelContainer } from "~/core/docker/tunnel";
import { createQueue } from "~/core/queue";
import db from "~/database";
import type { CloudflareTunnel } from "~/models/cloudflare";
import deleteCloudflareTunnel from "~/operations/deleteCloudflareTunnel";
import deleteService from "~/operations/deleteService";
import ensureTunnelService from "~/operations/ensureTunnelService";
import getCloudflareTunnel from "~/operations/getCloudflareTunnel";
import getTunnelService from "~/operations/getTunnelService";
import saveCloudflareTunnel from "~/operations/saveCloudflareTunnel";
import { cloudflareFetch } from "./client";
import { getConnectionState } from "./connection";
import { isCloudflareApiError } from "./errors";
import { type CloudflareZone, getZones } from "./zones";

type TunnelApiResponse = {
  id: string,
  deleted_at?: string | null,
};

const NOT_FOUND = 404;
const FORBIDDEN = 403;

/** Changes never overlap, otherwise they could create multiple tunnels */
const enqueue = createQueue("cloudflare-tunnel-queue");

function getPath({ accountId, id }: Pick<CloudflareTunnel, "accountId" | "id">) {
  return `/accounts/${accountId}/cfd_tunnel/${id}`;
}

async function ignoreApiStatus(promise: Promise<unknown>, ...statuses: number[]) {
  try {
    await promise;
  } catch (error) {
    if (!isCloudflareApiError(error) || !statuses.includes(error.status)) throw error;
  }
}

async function createTunnel(accountId: string): Promise<CloudflareTunnel> {
  const { result } = await cloudflareFetch<TunnelApiResponse>(`/accounts/${accountId}/cfd_tunnel`, {
    method: "POST",
    body: JSON.stringify({
      // The names must be unique in the account, which may be shared by several instances
      name: `buttler-${crypto.randomBytes(4).toString("hex")}`,
      config_src: "cloudflare",
    }),
  });
  const tunnel = { id: result.id, accountId, token: null };
  // Saved right away, so a setup that fails later doesn't leave the tunnel behind
  await saveCloudflareTunnel(db, tunnel);
  return tunnel;
}

async function isDeleted(tunnel: CloudflareTunnel) {
  try {
    const { result } = await cloudflareFetch<TunnelApiResponse>(getPath(tunnel));
    return Boolean(result.deleted_at);
  } catch (error) {
    if (isCloudflareApiError(error) && error.status === NOT_FOUND) return true;
    throw error;
  }
}

/** Only uses the tunnel that Buttler has created, others are never looked up */
async function ensureTunnel(accountId: string) {
  const existing = await getCloudflareTunnel(db);
  if (existing?.accountId === accountId && !await isDeleted(existing)) return existing;
  return createTunnel(accountId);
}

async function ensureToken(tunnel: CloudflareTunnel) {
  if (tunnel.token !== null) return tunnel.token;
  // There are no domains yet
  await cloudflareFetch(`${getPath(tunnel)}/configurations`, {
    method: "PUT",
    body: JSON.stringify({ config: { ingress: [{ service: "http_status:404" }] } }),
  });
  const { result: token } = await cloudflareFetch<string>(`${getPath(tunnel)}/token`);
  await saveCloudflareTunnel(db, { ...tunnel, token });
  return token;
}

/** Creates the tunnel in the account, unless there is one already, and starts cloudflared */
export function setUpTunnel(accountId: string): Promise<void> {
  return enqueue(async () => {
    const tunnel = await ensureTunnel(accountId);
    const token = await ensureToken(tunnel);
    const { id: serviceId } = await ensureTunnelService(db);
    await startTunnelContainer({ serviceId, tunnelId: tunnel.id, token });
  });
}

export type CloudflareAccount = {
  id: string,
  name: string,
};

export function getAccounts(zones: CloudflareZone[]): CloudflareAccount[] {
  return [...new Map(zones.map(({ accountId, accountName }) => [accountId, accountName]))]
    .map(([id, name]) => ({ id, name }));
}

/** Sets the tunnel up after connecting, unless the admin has to choose an account. Returns false in that case. */
export async function setUpTunnelAfterConnecting() {
  const accounts = getAccounts(await getZones());
  const tunnel = await getCloudflareTunnel(db);
  const account = accounts.find(({ id }) => id === tunnel?.accountId) ?? (accounts.length === 1 ? accounts[0] : null);
  if (!account) return false;
  await setUpTunnel(account.id);
  return true;
}

/** Starts cloudflared if there is a tunnel. Cloudflare doesn't have to be reachable, or to accept the connection. */
export function provisionTunnel(): Promise<boolean> {
  return enqueue(async () => {
    const tunnel = await getCloudflareTunnel(db);
    if (!tunnel?.token) return false;
    if (await getConnectionState() === "disconnected") return false;
    const { id: serviceId } = await ensureTunnelService(db);
    await startTunnelContainer({ serviceId, tunnelId: tunnel.id, token: tunnel.token });
    return true;
  });
}

/** Stops cloudflared and deletes the tunnel, it can be tried again if it fails */
export function removeTunnel(): Promise<void> {
  return enqueue(async () => {
    const tunnel = await getCloudflareTunnel(db);
    await removeTunnelContainer();
    // A tunnel stays in the account if the connection is lost, or doesn't include the account anymore
    if (tunnel && await getConnectionState() === "connected") {
      // Connections that were closed just now would prevent the deletion
      await ignoreApiStatus(cloudflareFetch(`${getPath(tunnel)}/connections`, { method: "DELETE" }), NOT_FOUND, FORBIDDEN);
      await ignoreApiStatus(cloudflareFetch(getPath(tunnel), { method: "DELETE" }), NOT_FOUND, FORBIDDEN);
    }
    await deleteCloudflareTunnel(db);
    const service = await getTunnelService(db);
    if (service) await deleteService(db, service.id);
  });
}

/** The tunnel without its token */
export async function getTunnelInfo() {
  const [
    tunnel,
    service,
  ] = await Promise.all([
    getCloudflareTunnel(db),
    getTunnelService(db),
  ]);
  if (!tunnel?.token || !service) return null;
  return { accountId: tunnel.accountId, serviceId: service.id };
}
