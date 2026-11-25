import { and, eq } from "drizzle-orm";
import type database from "~/database";
import { domains } from "~/database/schema/domains";
import { settings } from "~/database/schema/settings";
import type { NewDomainDTO } from "~/models/domain";
import { DASHBOARD_DOMAIN_KEY } from "./getDashboardDomain";

/** Adds a domain to a service, returns false if the hostname is already taken by a service or the dashboard */
export default function createDomain(db: typeof database, domain: NewDomainDTO) {
  return db.transaction(tx => {
    const isDashboardDomain = and(eq(settings.key, DASHBOARD_DOMAIN_KEY), eq(settings.value, domain.hostname));
    if (tx.select().from(settings).where(isDashboardDomain).get()) return false;
    return tx.insert(domains).values(domain).onConflictDoNothing().returning().all().length > 0;
  }, { behavior: "immediate" });
}
