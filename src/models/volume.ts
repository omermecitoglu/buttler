import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import { createSharedRefinements } from "drizzle-zod-shared-refinements";
import { volumes } from "~/database/schema/volumes";
import type z from "zod";

const sharedRefinements = createSharedRefinements(volumes, {
  id: schema => schema.readonly().describe("Unique identifier of the volume"),
  serviceId: schema => schema.describe("Service identifier this volume belongs to"),
  name: schema => schema.min(1, "Volume name cannot be empty").describe("Docker volume name"),
  containerPath: schema => schema.min(1, "Container path cannot be empty").startsWith("/", "Container path must be an absolute path starting with /").describe("Target container mount path"),
});

export const VolumeDTO = createSelectSchema(volumes, sharedRefinements)
  .describe("Represents a volume mount definition");

export const NewVolumeDTO = createInsertSchema(volumes, sharedRefinements).omit({
  id: true,
}).describe("Data Transfer Object for creating a new volume mount");

export const VolumePatchDTO = createUpdateSchema(volumes, sharedRefinements).omit({
  id: true,
}).describe("Data Transfer Object for updating an existing volume mount");

export type Volume = z.infer<typeof VolumeDTO>;
export type NewVolume = z.infer<typeof NewVolumeDTO>;
export type VolumePatch = z.infer<typeof VolumePatchDTO>;

export type VolumeDTO = Volume;
export type NewVolumeDTO = NewVolume;
export type VolumePatchDTO = VolumePatch;
