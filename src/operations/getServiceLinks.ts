import { eq, or } from "drizzle-orm";
import type database from "~/database";
import { serviceLinks } from "~/database/schema/service-links";

/** Returns the links of a service, or all of them without a service */
export default async function getServiceLinks(db: typeof database, serviceId?: string) {
  return await db.select().from(serviceLinks)
    .where(serviceId ? or(eq(serviceLinks.serviceAId, serviceId), eq(serviceLinks.serviceBId, serviceId)) : undefined)
    .orderBy(serviceLinks.createdAt, serviceLinks.id);
}

/** Returns the service on the other side of a link */
export function getLinkedServiceId(link: { serviceAId: string, serviceBId: string }, serviceId: string) {
  return link.serviceAId === serviceId ? link.serviceBId : link.serviceAId;
}
