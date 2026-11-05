import { eq } from "drizzle-orm";
import type database from "~/database";
import { services } from "~/database/schema/services";
import type { ServicePatchDTO } from "~/models/service";

export default async function updateService(db: typeof database, serviceId: string, data: ServicePatchDTO) {
  const [service] = await db.update(services).set(data).where(eq(services.id, serviceId)).returning();
  return service;
}
