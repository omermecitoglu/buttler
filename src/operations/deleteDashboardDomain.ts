import { eq } from "drizzle-orm";
import type database from "~/database";
import { settings } from "~/database/schema/settings";
import { DASHBOARD_DOMAIN_KEY } from "./getDashboardDomain";

/** Removes the hostname of the dashboard and returns it, or nothing if there is none */
export default async function deleteDashboardDomain(db: typeof database): Promise<string | undefined> {
  const deleted = await db.delete(settings).where(eq(settings.key, DASHBOARD_DOMAIN_KEY)).returning();
  return deleted.at(0)?.value;
}
