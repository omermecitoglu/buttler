import type database from "~/database";
import { serviceLinks } from "~/database/schema/service-links";

export default async function createServiceLink(db: Omit<typeof database, "$client">, clientId: string, providerId: string) {
  await db.insert(serviceLinks).values({
    clientId,
    providerId,
  });
}
