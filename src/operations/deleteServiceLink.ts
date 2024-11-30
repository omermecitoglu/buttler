import { and, eq } from "drizzle-orm";
import type database from "~/database";
import { serviceLinks } from "~/database/schema/service-links";

export default async function deleteServiceLink(db: Omit<typeof database, "$client">, serviceId: string, providerId: string) {
  await db
    .delete(serviceLinks)
    .where(and(
      eq(serviceLinks.serviceId, serviceId),
      eq(serviceLinks.providerId, providerId)
    ));
}
