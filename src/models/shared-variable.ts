import { createSelectSchema } from "drizzle-orm/zod";
import { createSharedRefinements } from "drizzle-zod-shared-refinements";
import { sharedVariables } from "~/database/schema/shared-variables";
import type z from "zod";

export const variableNamePattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

const sharedRefinements = createSharedRefinements(sharedVariables, {
  id: schema => schema.readonly().describe("Unique identifier of the shared variable"),
  serviceId: schema => schema.describe("Service that shares the variable"),
  key: schema => schema.min(1, "Key cannot be empty").regex(variableNamePattern, "Invalid environment variable name").describe("Name of the variable in the linked services, unless they rename it"),
  template: schema => schema.describe("Value template that refers to the sharing service with {host} and {env.NAME}"),
});

export const SharedVariableDTO = createSelectSchema(sharedVariables, sharedRefinements)
  .describe("Represents a variable that a service offers to its linked services");

export type SharedVariableDTO = z.infer<typeof SharedVariableDTO>;
