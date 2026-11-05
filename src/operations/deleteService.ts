import { eq } from "drizzle-orm";
import type database from "~/database";
import { services } from "~/database/schema/services";

export default async function deleteService(db: typeof database, serviceId: string) {
  const [service] = await db.delete(services).where(eq(services.id, serviceId)).returning();
  return service;
}
