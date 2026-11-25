import { eq } from "drizzle-orm";
import type database from "~/database";
import { domains } from "~/database/schema/domains";
import { settings } from "~/database/schema/settings";
import { DASHBOARD_DOMAIN_KEY } from "./getDashboardDomain";

/** Sets the hostname of the dashboard, returns false if a service already uses it */
export default function setDashboardDomain(db: typeof database, hostname: string) {
  return db.transaction(tx => {
    if (tx.select().from(domains).where(eq(domains.hostname, hostname)).get()) return false;
    tx.insert(settings)
      .values({ key: DASHBOARD_DOMAIN_KEY, value: hostname })
      .onConflictDoUpdate({ target: settings.key, set: { value: hostname } })
      .run();
    return true;
  }, { behavior: "immediate" });
}
