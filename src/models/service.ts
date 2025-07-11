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
  networkIds: z.string().array(),
  providers: z.object({
    id: z.string(),
    name: z.string(),
    repo: z.string(),
    containerId: z.string().nullable(),
    networkIds: z.string().array(),
    variables: z.record(z.string(), z.string()),
  }).array(),
  clients: z.object({
    id: z.string(),
    name: z.string(),
  }).array(),
});

const ServiceSchema = baseSchema.required()
  .describe("Represents a service running in the system");

export type ServiceDTO = z.infer<typeof ServiceSchema>;

export const NewServiceSchema = baseSchema.omit({
  id: true,
  environmentVariables: true,
  ports: true,
  volumes: true,
  networkIds: true,
  providers: true,
  clients: true,
  createdAt: true,
  updatedAt: true,
}).describe("Data Transfer Object for creating a new service");

export type NewServiceDTO = z.infer<typeof NewServiceSchema>;

export const ServicePatchSchema = NewServiceSchema.partial().omit({
}).describe("Data Transfer Object for updating an existing service");

export type ServicePatchDTO = z.infer<typeof ServicePatchSchema>;
