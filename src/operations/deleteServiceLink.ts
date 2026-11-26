import { and, eq, or } from "drizzle-orm";
import type database from "~/database";
import { serviceLinks } from "~/database/schema/service-links";
import type { ServiceLinkDTO } from "~/models/service-link";

/** Removes a link of a service and returns it, or nothing if the service isn't on that link */
export default async function deleteServiceLink(
  db: typeof database,
  serviceId: string,
  linkId: string,
): Promise<ServiceLinkDTO | undefined> {
  const [deleted] = await db.delete(serviceLinks)
    .where(and(
      eq(serviceLinks.id, linkId),
      or(eq(serviceLinks.serviceAId, serviceId), eq(serviceLinks.serviceBId, serviceId)),
    ))
    .returning();
  return deleted;
}
