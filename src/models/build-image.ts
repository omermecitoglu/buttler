import { createInsertSchema } from "drizzle-zod";
import { buildImages } from "~/database/schema/build-images";
import type z from "zod";

const baseSchema = createInsertSchema(buildImages, {
  id: schema => schema.id.readonly().describe("Unique identifier of the build image"),
  serviceId: schema => schema.serviceId.describe("ID of the service associated with this build image"),
  status: schema => schema.status.describe("Current status of the build image"),
  createdAt: schema => schema.createdAt.readonly().describe("Creation date of the build image as an ISO 8601 date string"),
  updatedAt: schema => schema.updatedAt.readonly().describe("Modification date of the build image as an ISO 8601 date string"),
});

export const BuildImageDTO = baseSchema.required()
  .describe("Represents a build image definition");

export const NewBuildImageDTO = baseSchema.omit({
  // id: true,
  createdAt: true,
  updatedAt: true,
}).describe("Data Transfer Object for creating a new build image");

export const BuildImagePatchDTO = NewBuildImageDTO.partial().omit({
}).describe("Data Transfer Object for updating an existing build image");

export function testBuildImageData() {
  return {
    id: "unknown-build",
    serviceId: "unknown-service",
  } satisfies z.infer<typeof NewBuildImageDTO>;
}
