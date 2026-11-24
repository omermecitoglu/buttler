import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import { createSharedRefinements } from "drizzle-zod-shared-refinements";
import { environmentVariables } from "~/database/schema/environment-variables";
import type z from "zod";

const sharedRefinements = createSharedRefinements(environmentVariables, {
  serviceId: schema => schema.describe("Service identifier this environment variable belongs to"),
  key: schema => schema.min(1, "Key cannot be empty").regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "Invalid environment variable name").describe("Environment variable key name"),
  value: schema => schema.describe("Environment variable value, encrypted if it is a secret"),
  scope: schema => schema.describe("Where the environment variable is available (build, runtime, both)"),
  isSecret: schema => schema.describe("Whether the value is a secret"),
});

export const EnvironmentVariableDTO = createSelectSchema(environmentVariables, sharedRefinements)
  .describe("Represents an environment variable definition");

export const NewEnvironmentVariableDTO = createInsertSchema(environmentVariables, sharedRefinements)
  .describe("Data Transfer Object for creating a new environment variable");

export const EnvironmentVariablePatchDTO = createUpdateSchema(environmentVariables, sharedRefinements)
  .describe("Data Transfer Object for updating an existing environment variable");

export type EnvironmentVariable = z.infer<typeof EnvironmentVariableDTO>;
export type NewEnvironmentVariable = z.infer<typeof NewEnvironmentVariableDTO>;
export type EnvironmentVariablePatch = z.infer<typeof EnvironmentVariablePatchDTO>;

export type EnvironmentVariableDTO = EnvironmentVariable;
export type NewEnvironmentVariableDTO = NewEnvironmentVariable;
export type EnvironmentVariablePatchDTO = EnvironmentVariablePatch;
