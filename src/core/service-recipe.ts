import z from "zod";
import { environmentVariableScopes } from "./environment-variables";

/** Changes when the format of the file changes, so older files can still be read or rejected */
export const SERVICE_RECIPE_VERSION = 1;

export const SERVICE_RECIPE_FILE_NAME = "buttler-services.json";

const ServiceRecipeServiceSchema = z.object({
  /** The ID on the Buttler that exported it, only used to refer to the service in the file */
  id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(["github", "dockerhub"]),
  repository: z.string().nullable(),
  branch: z.string().nullable(),
  internetAccess: z.boolean(),
  ports: z.array(z.object({
    external: z.int().min(1).max(65535),
    internal: z.int().min(1).max(65535),
  })),
  volumes: z.array(z.object({
    name: z.string().min(1),
    containerPath: z.string().min(1),
  })),
  environmentVariables: z.array(z.object({
    key: z.string().min(1),
    /** Secret values are never exported */
    value: z.string().nullable(),
    scope: z.enum(environmentVariableScopes),
    isSecret: z.boolean(),
  })),
  domains: z.array(z.object({
    hostname: z.string().min(1),
    port: z.int().min(1).max(65535),
  })),
  sharedVariables: z.array(z.object({
    key: z.string().min(1),
    template: z.string(),
  })),
});

const ServiceRecipeLinkSchema = z.object({
  /** The IDs of the two services in the file */
  services: z.tuple([z.string().min(1), z.string().min(1)]),
  /** Whether each side inherits the shared variables of the other one, in the order of `services` */
  inherits: z.tuple([z.boolean(), z.boolean()]),
  /** The inherited variables that are renamed by the other side of the link */
  names: z.array(z.object({
    /** The service that shares the variable */
    service: z.string().min(1),
    key: z.string().min(1),
    name: z.string().min(1),
  })),
});

export const ServiceRecipeSchema = z.object({
  version: z.literal(SERVICE_RECIPE_VERSION),
  services: z.array(ServiceRecipeServiceSchema),
  links: z.array(ServiceRecipeLinkSchema),
});

export type ServiceRecipe = z.infer<typeof ServiceRecipeSchema>;
export type ServiceRecipeService = z.infer<typeof ServiceRecipeServiceSchema>;
export type ServiceRecipeLink = z.infer<typeof ServiceRecipeLinkSchema>;
