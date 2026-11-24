import type database from "~/database";
import { domains } from "~/database/schema/domains";
import type { NewDomainDTO } from "~/models/domain";

/** Adds a domain to a service, returns false if the hostname is already taken */
export default async function createDomain(db: typeof database, domain: NewDomainDTO) {
  const created = await db.insert(domains).values(domain).onConflictDoNothing().returning();
  return created.length > 0;
}
