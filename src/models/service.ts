import { createInsertSchema } from "drizzle-zod";
import z from "zod";
import { services } from "~/database/schema/services";

const baseSchema = createInsertSchema(services, {
  id: schema => schema.id.readonly().describe("Unique identifier of the service"),
  name: schema => schema.name.describe("Name of the service"),
  createdAt: schema => schema.createdAt.readonly().describe("Creation date of the service as an ISO 8601 date string"),
  updatedAt: schema => schema.updatedAt.readonly().describe("Modification date of the service as an ISO 8601 date string"),
}).extend({
  environmentVariables: z.record(z.string(), z.string()),
  ports: z.record(z.string(), z.string()),
  volumes: z.record(z.string(), z.string()),
});

export const ServiceDTO = baseSchema.required()
  .describe("Represents a service running in the system");

export const NewServiceDTO = baseSchema.omit({
  id: true,
  environmentVariables: true,
  ports: true,
  volumes: true,
  createdAt: true,
  updatedAt: true,
}).describe("Data Transfer Object for creating a new service");

export const ServicePatchDTO = NewServiceDTO.partial().omit({
}).describe("Data Transfer Object for updating an existing service");

export function testServiceData() {
  return {
    kind: "git",
    name: "unknown",
    repo: "unknown-git-repo",
  } satisfies z.infer<typeof NewServiceDTO>;
}
