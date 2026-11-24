import type database from "~/database";
import { domains } from "~/database/schema/domains";

/** Returns the IDs of the services that have at least one domain */
export default async function getServicesWithDomains(db: typeof database) {
  const rows = await db.selectDistinct({ serviceId: domains.serviceId }).from(domains);
  return rows.map(row => row.serviceId);
}
