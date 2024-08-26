import { createInsertSchema } from "drizzle-zod";
import { environmentVariables } from "~/database/schema/environment-variables";
import type z from "zod";

const baseSchema = createInsertSchema(environmentVariables, {
  id: schema => schema.id.readonly().describe("Unique identifier of the environment variable"),
  name: schema => schema.name.describe("Name of the environment variable"),
  value: schema => schema.value.describe("Value of the environment variable"),
  serviceId: schema => schema.serviceId.describe("ID of the service associated with this environment variable"),
  createdAt: schema => schema.createdAt.readonly().describe("Creation date of the env as an ISO 8601 date string"),
  updatedAt: schema => schema.updatedAt.readonly().describe("Modification date of the env as an ISO 8601 date string"),
});

export const EnvironmentVariableDTO = baseSchema.required()
  .describe("Represents a environment variable definition");

export const NewEnvironmentVariableDTO = baseSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).describe("Data Transfer Object for creating a new environment variable");

export const EnvironmentVariablePatchDTO = NewEnvironmentVariableDTO.partial().omit({
}).describe("Data Transfer Object for updating an existing environment variable");

export function testEnvironmentVariableData() {
  return {
    name: "key",
    value: "value",
    serviceId: "unknown-service",
  } satisfies z.infer<typeof NewEnvironmentVariableDTO>;
}
