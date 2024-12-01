import crypto from "node:crypto";
import { createInsertSchema } from "drizzle-zod";
import type database from "~/database";
import { volumes } from "~/database/schema/volumes";
import type z from "zod";

const baseSchema = createInsertSchema(volumes, {
  id: schema => schema.id.readonly().describe("Unique identifier of the volume"),
  serviceId: schema => schema.serviceId.describe("Service ID of the volume"),
  containerPath: schema => schema.containerPath.describe("Container path of the volume"),
});

const NewVolumeDTO = baseSchema.omit({
  id: true,
}).describe("Data Transfer Object for creating a new volume");

export default async function createVolume(db: Omit<typeof database, "$client">, data: z.infer<typeof NewVolumeDTO>) {
  const [volume] = await db.insert(volumes).values({
    id: crypto.randomUUID(),
    ...data,
  }).returning({ id: volumes.id });
  return volume;
}
