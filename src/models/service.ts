import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import { createSharedRefinements } from "drizzle-zod-shared-refinements";
import { services } from "~/database/schema/services";
import type z from "zod";

const sharedRefinements = createSharedRefinements(services, {
  id: schema => schema.readonly().describe("Unique identifier of the service"),
  name: schema => schema.describe("Name of the service"),
  type: schema => schema.describe("Type of the service (github, dockerhub, system)"),
  repository: schema => schema.describe("GitHub repository or DockerHub image reference"),
  branch: schema => schema.describe("Git branch or Docker image tag"),
  createdAt: schema => schema.readonly().describe("Creation date of the service as an ISO 8601 date string"),
  updatedAt: schema => schema.readonly().describe("Modification date of the service as an ISO 8601 date string"),
});

export const ServiceDTO = createSelectSchema(services, sharedRefinements)
  .describe("Represents a service definition");

export const NewServiceDTO = createInsertSchema(services, sharedRefinements).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).describe("Data Transfer Object for creating a new service");

export const ServicePatchDTO = createUpdateSchema(services, sharedRefinements).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).describe("Data Transfer Object for updating an existing service");

export type Service = z.infer<typeof ServiceDTO>;
export type NewService = z.infer<typeof NewServiceDTO>;
export type ServicePatch = z.infer<typeof ServicePatchDTO>;

// Aliases for DTO types
export type ServiceDTO = Service;
export type NewServiceDTO = NewService;
export type ServicePatchDTO = ServicePatch;
