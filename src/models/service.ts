import { createInsertSchema } from "drizzle-zod";
import { services } from "~/database/schema/services";
import type z from "zod";

const baseSchema = createInsertSchema(services, {
  id: schema => schema.id.readonly().describe("Unique identifier of the service"),
  name: schema => schema.name.describe("Name of the service"),
  createdAt: schema => schema.createdAt.readonly().describe("Creation date of the service as an ISO 8601 date string"),
  updatedAt: schema => schema.updatedAt.readonly().describe("Modification date of the service as an ISO 8601 date string"),
});

export const ServiceDTO = baseSchema.required()
  .describe("Represents a service running in the system");

export const NewServiceDTO = baseSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).describe("Data Transfer Object for creating a new service");

export const ServicePatchDTO = NewServiceDTO.partial().omit({
}).describe("Data Transfer Object for updating an existing service");

export function testServiceData() {
  return {
    name: "unknown",
  } satisfies z.infer<typeof NewServiceDTO>;
}