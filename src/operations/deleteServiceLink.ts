import { and, eq } from "drizzle-orm";
import type database from "~/database";
import { serviceLinks } from "~/database/schema/service-links";

export default async function deleteServiceLink(db: Omit<typeof database, "$client">, clientId: string, providerId: string) {
  await db
    .delete(serviceLinks)
    .where(and(
      eq(serviceLinks.clientId, clientId),
      eq(serviceLinks.providerId, providerId)
    ));
}
