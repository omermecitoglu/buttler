import type database from "~/database";
import { services } from "~/database/schema/services";
import type { NewServiceDTO } from "~/models/service";

export default async function createService(db: Omit<typeof database, "$client">, data: NewServiceDTO) {
  const [service] = await db.insert(services).values({
    id: crypto.randomUUID(),
    ...data,
  }).returning({ id: services.id });
  return service;
}
