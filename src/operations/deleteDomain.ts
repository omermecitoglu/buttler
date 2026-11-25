import { and, eq } from "drizzle-orm";
import type database from "~/database";
import { domains } from "~/database/schema/domains";
import type { DomainDTO } from "~/models/domain";

/** Removes a domain from a service and returns it, or nothing if the service doesn't have it */
export default async function deleteDomain(
  db: typeof database,
  serviceId: DomainDTO["serviceId"],
  hostname: DomainDTO["hostname"],
): Promise<DomainDTO | undefined> {
  const [deleted] = await db.delete(domains)
    .where(and(eq(domains.serviceId, serviceId), eq(domains.hostname, hostname)))
    .returning();
  return deleted;
}
