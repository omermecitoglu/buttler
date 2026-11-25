import type database from "~/database";

export const DASHBOARD_DOMAIN_KEY = "dashboard_domain";

/** Returns the public hostname of the Buttler dashboard, or null if it doesn't have one */
export default async function getDashboardDomain(db: typeof database) {
  const setting = await db.query.settings.findFirst({
    where: { key: DASHBOARD_DOMAIN_KEY },
  });
  return setting?.value ?? null;
}
