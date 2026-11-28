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

/** Returns the services that inherit the shared variables of a service through its links */
export async function getInheritingServiceIds(db: typeof database, serviceId: string) {
  return (await getServiceLinks(db, serviceId))
    .filter(link => (link.serviceAId === serviceId ? link.serviceBInherits : link.serviceAInherits))
    .map(link => getLinkedServiceId(link, serviceId));
}
