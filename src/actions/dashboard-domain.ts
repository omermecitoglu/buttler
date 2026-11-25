"use server";
import { defineFormAction, displayMessage } from "@omer-x/next-form-actions";
import { refresh } from "next/cache";
import z from "zod";
import { findDomainZone, syncDomains } from "~/core/cloudflare/domains";
import { isHostname, joinHostname, normalizeHostname } from "~/core/domains";
import { syncReverseProxyConfig } from "~/core/nginx";
import db from "~/database";
import deleteDashboardDomain from "~/operations/deleteDashboardDomain";
import getDashboardDomain from "~/operations/getDashboardDomain";
import setDashboardDomain from "~/operations/setDashboardDomain";
import { adminMiddleware } from "./middlewares/admin";
import { setupMiddleware } from "./middlewares/setup";

async function restoreDashboardDomain(hostname: string | null) {
  try {
    if (hostname === null) {
      await deleteDashboardDomain(db);
    } else {
      setDashboardDomain(db, hostname);
    }
    // Another change may have used the domain before it was reverted
    await syncReverseProxyConfig();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to revert the domain change of the dashboard:", error);
  }
  await syncDomains();
}

export const setDashboardDomainAction = defineFormAction({
  middlewares: [setupMiddleware],
  schema: z.object({
    subdomain: z.string().transform(normalizeHostname),
    zoneId: z.string(),
  }),
  action: ({ subdomain, zoneId }) => async (): Promise<Record<string, string>> => {
    const zone = await findDomainZone(zoneId);
    if (!zone) return displayMessage("error", "zone_unavailable");
    const hostname = joinHostname(subdomain, zone.name);
    if (!isHostname(hostname)) return displayMessage("error", "invalid_hostname");
    const previousHostname = await getDashboardDomain(db);
    if (!setDashboardDomain(db, hostname)) return displayMessage("error", "hostname_taken");
    try {
      await syncReverseProxyConfig();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Failed to serve the dashboard at ${hostname}:`, error);
      await restoreDashboardDomain(previousHostname);
      return displayMessage("error", "reload_failed");
    }
    // It's only public after it can be served
    await syncDomains();
    refresh();
    return {};
  },
});

export const removeDashboardDomainAction = defineFormAction({
  middlewares: [adminMiddleware],
  schema: z.object({}),
  action: () => async (): Promise<Record<string, string>> => {
    const hostname = await deleteDashboardDomain(db);
    if (hostname === undefined) return displayMessage("error", "remove_failed");
    // It's not served anymore even if Cloudflare can't be reached, the rest is tried again later
    await syncDomains();
    try {
      await syncReverseProxyConfig();
    } catch (error) {
      // The dashboard is still served, so the domain must stay visible
      // eslint-disable-next-line no-console
      console.error(`Failed to stop serving the dashboard at ${hostname}:`, error);
      await restoreDashboardDomain(hostname);
      return displayMessage("error", "reload_failed");
    }
    refresh();
    return {};
  },
});
