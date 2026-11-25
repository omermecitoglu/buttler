"use server";
import { defineFormAction, displayMessage } from "@omer-x/next-form-actions";
import { refresh } from "next/cache";
import z from "zod";
import { isHostname, normalizeHostname } from "~/core/domains";
import { syncReverseProxyConfig } from "~/core/nginx";
import db from "~/database";
import deleteDashboardDomain from "~/operations/deleteDashboardDomain";
import getDashboardDomain from "~/operations/getDashboardDomain";
import setDashboardDomain from "~/operations/setDashboardDomain";
import { adminMiddleware } from "./middlewares/admin";

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
}

export const setDashboardDomainAction = defineFormAction({
  middlewares: [adminMiddleware],
  schema: z.object({
    hostname: z.string().transform(normalizeHostname).refine(isHostname, "invalid_hostname"),
  }),
  action: ({ hostname }) => async (): Promise<Record<string, string>> => {
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
