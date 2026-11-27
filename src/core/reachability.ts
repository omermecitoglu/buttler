import "server-only";
import crypto from "node:crypto";
import { Resolver } from "node:dns/promises";
import https from "node:https";
import { text } from "node:stream/consumers";
import { getSharedState } from "./shared-state";

const TIMEOUT = 10_000;
const DNS_TIMEOUT = 2_000;

const OK = 200;
const BAD_GATEWAY = 502;
const GATEWAY_TIMEOUT = 504;
/** Cloudflare responds with it while the tunnel is not connected */
const TUNNEL_ERROR = 530;

const INSTANCE_PATH = "/auth/instance";

export type ReachabilityProblem = {
  reason: "unknown_host" | "no_connection" | "no_tunnel" | "no_dashboard" | "other_response",
  details: string,
};

/** Only tells the instances apart, it's not a secret */
export function getInstanceId() {
  return getSharedState("instance-id", () => crypto.randomUUID());
}

function isUnknownHost(error: unknown) {
  const { code } = error as NodeJS.ErrnoException;
  return code === "ENOTFOUND" || code === "ENODATA";
}

async function findNameServers(zoneName: string) {
  const resolver = new Resolver({ timeout: DNS_TIMEOUT, tries: 1 });
  const names = await resolver.resolveNs(zoneName);
  const addresses = await Promise.allSettled(names.map(name => resolver.resolve4(name)));
  return addresses.filter(result => result.status === "fulfilled").flatMap(({ value }) => value);
}

/**
 * Asks the name servers of the zone. The resolver of the computer, which the browser also uses, may remember for a long
 * time that a hostname doesn't exist, so it must not be asked before the DNS record is there.
 * Returns undefined if they can't be asked, and null if they don't know the hostname.
 */
async function findAddress(hostname: string, zoneName: string) {
  try {
    const nameServers = await findNameServers(zoneName);
    if (nameServers.length === 0) return;
    const resolver = new Resolver({ timeout: DNS_TIMEOUT, tries: 1 });
    resolver.setServers(nameServers);
    const addresses = await resolver.resolve4(hostname).catch((error: unknown) => {
      if (isUnknownHost(error)) return [];
      throw error;
    });
    return addresses.at(0) ?? null;
  } catch {
    // Some networks don't let other name servers be used
  }
}

/** Redirects are not followed, they lead to something else */
function requestInstanceId(hostname: string, address: string | undefined) {
  return new Promise<{ status: number, body: string }>((resolve, reject) => {
    https.get({
      host: address ?? hostname,
      servername: hostname,
      headers: { Host: hostname },
      path: INSTANCE_PATH,
      agent: false,
      signal: AbortSignal.timeout(TIMEOUT),
    }, response => {
      text(response).then(body => resolve({ status: response.statusCode ?? 0, body }), reject);
    }).on("error", reject);
  });
}

function describeResponse(status: number): ReachabilityProblem {
  const details = `${status}`;
  if (status === TUNNEL_ERROR) return { reason: "no_tunnel", details };
  if (status === BAD_GATEWAY || status === GATEWAY_TIMEOUT) return { reason: "no_dashboard", details };
  return { reason: "other_response", details };
}

/** Checks whether the requests to the hostname reach this instance, and returns the reason if they don't */
export async function checkReachability(hostname: string, zoneName?: string): Promise<ReachabilityProblem | null> {
  const address = zoneName === undefined ? undefined : await findAddress(hostname, zoneName);
  if (address === null) return { reason: "unknown_host", details: "" };
  try {
    const { status, body } = await requestInstanceId(hostname, address);
    return status === OK && body === getInstanceId() ? null : describeResponse(status);
  } catch (error) {
    if (isUnknownHost(error)) return { reason: "unknown_host", details: "" };
    return { reason: "no_connection", details: error instanceof Error ? error.message : "" };
  }
}
