import "server-only";
import db from "~/database";
import getDashboardDomain from "~/operations/getDashboardDomain";
import { getConnectionState } from "./cloudflare/connection";
import { type DomainStatus, getDomainStatuses, getDomainZones } from "./cloudflare/domains";
import { getTunnelInfo } from "./cloudflare/tunnel";
import { findZone } from "./domains";
import { type ReachabilityProblem, checkReachability } from "./reachability";

export type SetupProgress = {
  step: "cloudflare",
} | {
  step: "domain",
  hostname: null,
} | {
  step: "domain",
  hostname: string,
  status: DomainStatus,
  /** Only checked if Cloudflare is up to date with the domain */
  problem: ReachabilityProblem | null,
} | {
  step: "github",
  hostname: string,
};

async function findZoneName(hostname: string) {
  try {
    return findZone(hostname, await getDomainZones() ?? [])?.name;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to load the zones of Cloudflare:", error);
  }
}

/**
 * The step before the GitHub App is created. Nothing is saved for it, so an interrupted setup continues where it
 * stopped, and goes back if something doesn't work anymore.
 */
export async function getSetupProgress(): Promise<SetupProgress> {
  if (await getConnectionState() !== "connected" || !await getTunnelInfo()) return { step: "cloudflare" };
  const hostname = await getDashboardDomain(db);
  if (hostname === null) return { step: "domain", hostname };
  const [status] = await getDomainStatuses([hostname]);
  if (status.state !== "active") return { step: "domain", hostname, status, problem: null };
  const problem = await checkReachability(hostname, await findZoneName(hostname));
  return problem ? { step: "domain", hostname, status, problem } : { step: "github", hostname };
}
