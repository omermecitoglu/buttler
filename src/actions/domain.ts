"use server";
import { defineFormAction, displayMessage } from "@omer-x/next-form-actions";
import { refresh, updateTag } from "next/cache";
import z from "zod";
import { findDomainZone, syncDomains } from "~/core/cloudflare/domains";
import { syncReverseProxyLinks } from "~/core/docker/links";
import { isHostname, isPort, joinHostname, normalizeHostname } from "~/core/domains";
import { syncReverseProxyConfig } from "~/core/nginx";
import db from "~/database";
import type { DomainDTO } from "~/models/domain";
import type { ServiceDTO } from "~/models/service";
import createDomain from "~/operations/createDomain";
import deleteDomain from "~/operations/deleteDomain";
import getService from "~/operations/getService";
import { adminMiddleware } from "./middlewares/admin";
import { setupMiddleware } from "./middlewares/setup";

/** Another change may have used a domain before it was reverted, so everything is synced again */
async function syncRevertedDomain(serviceId: ServiceDTO["id"]) {
  try {
    await syncReverseProxyLinks(serviceId);
    await syncReverseProxyConfig();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Failed to revert the domain change of service ${serviceId}:`, error);
  }
  await syncDomains();
}

export const addDomainAction = defineFormAction({
  middlewares: [adminMiddleware],
  schema: z.object({
    subdomain: z.string().transform(normalizeHostname),
    zoneId: z.string(),
    port: z.string().transform(Number).refine(isPort, "invalid_port"),
  }),
  action: ({ subdomain, zoneId, port }) => async (serviceId: ServiceDTO["id"]): Promise<Record<string, string>> => {
    const service = await getService(db, serviceId);
    if (!service || service.type === "system") return displayMessage("error", "add_failed");
    const zone = await findDomainZone(zoneId);
    if (!zone) return displayMessage("error", "zone_unavailable");
    const hostname = joinHostname(subdomain, zone.name);
    if (!isHostname(hostname)) return displayMessage("error", "invalid_hostname");
    if (!createDomain(db, { hostname, serviceId, port })) return displayMessage("error", "hostname_taken");
    try {
      await syncReverseProxyLinks(serviceId);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Failed to connect service ${serviceId} to the reverse proxy:`, error);
      await deleteDomain(db, serviceId, hostname);
      await syncRevertedDomain(serviceId);
      return displayMessage("error", "connect_failed");
    }
    try {
      await syncReverseProxyConfig();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Failed to add ${hostname} to the reverse proxy:`, error);
      await deleteDomain(db, serviceId, hostname);
      await syncRevertedDomain(serviceId);
      return displayMessage("error", "reload_failed");
    }
    // It's only public after it can be served
    await syncDomains();
    updateTag(`getSingleService(${serviceId})`);
    // nginx is linked to the services with a domain
    updateTag("getLinksOfService(...)");
    updateTag("getServiceGraph()");
    return {};
  },
});

export const removeDomainAction = defineFormAction({
  middlewares: [adminMiddleware],
  schema: z.object({}),
  action: () => async (
    serviceId: ServiceDTO["id"],
    hostname: DomainDTO["hostname"],
  ): Promise<Record<string, string>> => {
    const domain = await deleteDomain(db, serviceId, hostname);
    if (!domain) return displayMessage("error", "remove_failed");
    // It's not served anymore even if Cloudflare can't be reached, the rest is tried again later
    await syncDomains();
    try {
      await syncReverseProxyConfig();
    } catch (error) {
      // The domain is still served, so it must stay visible
      // eslint-disable-next-line no-console
      console.error(`Failed to remove ${hostname} from the reverse proxy:`, error);
      createDomain(db, domain);
      await syncRevertedDomain(serviceId);
      return displayMessage("error", "reload_failed");
    }
    try {
      await syncReverseProxyLinks(serviceId);
    } catch (error) {
      // The domain is already gone, a leftover link is removed with the next sync
      // eslint-disable-next-line no-console
      console.error(`Failed to disconnect service ${serviceId} from the reverse proxy:`, error);
    }
    updateTag(`getSingleService(${serviceId})`);
    // nginx is linked to the services with a domain
    updateTag("getLinksOfService(...)");
    updateTag("getServiceGraph()");
    return {};
  },
});

/** Tries the domains that failed again, and checks the others */
export const syncDomainsAction = defineFormAction({
  middlewares: [setupMiddleware],
  schema: z.object({}),
  action: () => async (): Promise<Record<string, string>> => {
    await syncDomains({ verify: true });
    refresh();
    return {};
  },
});

/** Replaces the DNS records of a domain that Buttler didn't create, only if they are still the same */
export const takeOverDomainAction = defineFormAction({
  middlewares: [setupMiddleware],
  schema: z.object({}),
  action: () => async (hostname: DomainDTO["hostname"], records: string): Promise<Record<string, string>> => {
    await syncDomains({ takeover: { hostname, records } });
    refresh();
    return {};
  },
});
