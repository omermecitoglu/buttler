import "server-only";
import db from "~/database";
import forgetDnsRecord from "~/operations/deleteDnsRecord";
import getDnsRecords from "~/operations/getDnsRecords";
import { cloudflareFetch } from "./client";
import { isCloudflareApiError } from "./errors";

export type AddressRecord = {
  id: string,
  name: string,
  type: string,
  content: string,
  proxied?: boolean,
  comment?: string | null,
};

const COMMENT = "Managed by Buttler";
const PAGE_SIZE = 100;
const NOT_FOUND = 404;
const FORBIDDEN = 403;

/** A hostname with one of them can't have the record of a tunnel. The others, like TXT, can stay next to it. */
const ADDRESS_TYPES = ["A", "AAAA", "CNAME"];

function getPath(zoneId: string, recordId?: string) {
  return `/zones/${zoneId}/dns_records${recordId === undefined ? "" : `/${recordId}`}`;
}

function getTunnelTarget(tunnelId: string) {
  return `${tunnelId}.cfargotunnel.com`;
}

function generateRecord(hostname: string, tunnelId: string) {
  return {
    type: "CNAME",
    name: hostname,
    content: getTunnelTarget(tunnelId),
    proxied: true,
    comment: COMMENT,
  };
}

export function isTunnelRecord({ type, content, proxied }: AddressRecord, tunnelId: string) {
  return type === "CNAME" && content === getTunnelTarget(tunnelId) && proxied === true;
}

/** A record that was created, but couldn't be saved. Its target only belongs to this instance. */
export function isUnsavedRecord(record: AddressRecord, tunnelId: string) {
  return isTunnelRecord(record, tunnelId) && record.comment === COMMENT;
}

export async function findAddressRecords(zoneId: string, hostname: string) {
  const query = new URLSearchParams([["name.exact", hostname], ["per_page", `${PAGE_SIZE}`]]);
  const { result } = await cloudflareFetch<AddressRecord[]>(`${getPath(zoneId)}?${query}`);
  return result.filter(({ name, type }) => name.toLowerCase() === hostname && ADDRESS_TYPES.includes(type));
}

/** Describes the records for the user. The same records always have the same description. */
export function describeRecords(records: AddressRecord[]) {
  return records.map(({ type, content }) => `${type} ${content}`).sort().join(", ");
}

export async function createTunnelRecord(zoneId: string, hostname: string, tunnelId: string) {
  const { result } = await cloudflareFetch<AddressRecord>(getPath(zoneId), {
    method: "POST",
    body: JSON.stringify(generateRecord(hostname, tunnelId)),
  });
  return result.id;
}

/** The records are only deleted if the new one can be created */
export async function replaceWithTunnelRecord(
  zoneId: string,
  replaced: AddressRecord[],
  hostname: string,
  tunnelId: string,
) {
  const { result } = await cloudflareFetch<{ posts: AddressRecord[] }>(`${getPath(zoneId)}/batch`, {
    method: "POST",
    body: JSON.stringify({
      deletes: replaced.map(({ id }) => ({ id })),
      posts: [generateRecord(hostname, tunnelId)],
    }),
  });
  return result.posts[0].id;
}

export async function updateTunnelRecord(zoneId: string, recordId: string, hostname: string, tunnelId: string) {
  await cloudflareFetch(getPath(zoneId, recordId), {
    method: "PATCH",
    body: JSON.stringify(generateRecord(hostname, tunnelId)),
  });
}

/** A record that is already gone is not a failure */
export async function deleteRecord(zoneId: string, recordId: string) {
  try {
    await cloudflareFetch(getPath(zoneId, recordId), { method: "DELETE" });
  } catch (error) {
    if (!isCloudflareApiError(error) || error.status !== NOT_FOUND) throw error;
  }
}

/** Deletes all records of Buttler, so they don't lead to a tunnel that is gone */
export async function deleteAllRecords() {
  for (const { hostname, zoneId, recordId } of await getDnsRecords(db)) {
    if (zoneId !== null && recordId !== null) {
      try {
        await deleteRecord(zoneId, recordId);
      } catch (error) {
        if (!isCloudflareApiError(error) || error.status !== FORBIDDEN) throw error;
        // It stays known, the connection may include its account again
        continue;
      }
    }
    await forgetDnsRecord(db, hostname);
  }
}
