import "server-only";
import { cache } from "react";
import { getDomainZones } from "~/core/cloudflare/domains";
import type { CloudflareZone } from "~/core/cloudflare/zones";

export type DomainZones = {
  state: "ready",
  zones: Pick<CloudflareZone, "id" | "name">[],
} | {
  state: "disconnected" | "unavailable",
};

/** The zones that a domain can be added to, or why there are none */
export const loadDomainZones = cache(async (): Promise<DomainZones> => {
  try {
    const zones = await getDomainZones();
    if (!zones) return { state: "disconnected" };
    return { state: "ready", zones: zones.map(({ id, name }) => ({ id, name })) };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to load the zones of Cloudflare:", error);
    return { state: "unavailable" };
  }
});
