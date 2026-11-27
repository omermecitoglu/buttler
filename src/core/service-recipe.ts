import z from "zod";
import { variableNamePattern } from "~/models/shared-variable";
import { isVolumeName } from "./docker/removal";
import { isHostname } from "./domains";
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
    // Docker doesn't accept other names, paths are on the host
    name: z.string().refine(name => isVolumeName(name) || name.startsWith("/")),
    containerPath: z.string().startsWith("/"),
  })),
  environmentVariables: z.array(z.object({
    key: z.string().regex(variableNamePattern),
    /** Secret values are never exported */
    value: z.string().nullable(),
    scope: z.enum(environmentVariableScopes),
    isSecret: z.boolean(),
  })),
  domains: z.array(z.object({
    hostname: z.string().refine(isHostname),
    port: z.int().min(1).max(65535),
  })),
  sharedVariables: z.array(z.object({
    key: z.string().regex(variableNamePattern),
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
    key: z.string().regex(variableNamePattern),
    name: z.string().regex(variableNamePattern),
  })),
});

function hasDuplicates(values: string[]) {
  return new Set(values).size !== values.length;
}

/** A file that is edited by hand can refer to things that aren't in it */
function checkReferences(recipe: { services: ServiceRecipeService[], links: ServiceRecipeLink[] }, ctx: z.RefinementCtx) {
  const services = new Map(recipe.services.map(service => [service.id, service]));
  if (services.size !== recipe.services.length) {
    ctx.addIssue({ code: "custom", message: "duplicate_service_ids", path: ["services"] });
  }
  if (hasDuplicates(recipe.services.flatMap(service => service.domains.map(({ hostname }) => hostname)))) {
    ctx.addIssue({ code: "custom", message: "duplicate_domains", path: ["services"] });
  }
  for (const [index, service] of recipe.services.entries()) {
    if (hasDuplicates(service.environmentVariables.map(({ key }) => key))) {
      ctx.addIssue({ code: "custom", message: "duplicate_environment_variables", path: ["services", index] });
    }
    if (hasDuplicates(service.sharedVariables.map(({ key }) => key))) {
      ctx.addIssue({ code: "custom", message: "duplicate_shared_variables", path: ["services", index] });
    }
    if (hasDuplicates(service.ports.map(({ external }) => String(external)))) {
      ctx.addIssue({ code: "custom", message: "duplicate_ports", path: ["services", index] });
    }
  }
  if (hasDuplicates(recipe.links.map(link => [...link.services].sort().join(" ")))) {
    ctx.addIssue({ code: "custom", message: "duplicate_links", path: ["links"] });
  }
  for (const [index, link] of recipe.links.entries()) {
    const [first, second] = link.services;
    if (first === second || !services.has(first) || !services.has(second)) {
      ctx.addIssue({ code: "custom", message: "unknown_link_service", path: ["links", index] });
      continue;
    }
    const namesAreValid = link.names.every(({ service, key }) => {
      return link.services.includes(service) && services.get(service)?.sharedVariables.some(variable => variable.key === key);
    });
    if (!namesAreValid || hasDuplicates(link.names.map(({ service, key }) => `${service} ${key}`))) {
      ctx.addIssue({ code: "custom", message: "unknown_shared_variable", path: ["links", index] });
    }
  }
}

export const ServiceRecipeSchema = z.object({
  version: z.literal(SERVICE_RECIPE_VERSION),
  services: z.array(ServiceRecipeServiceSchema),
  links: z.array(ServiceRecipeLinkSchema),
}).superRefine(checkReferences);

export type ServiceRecipe = z.infer<typeof ServiceRecipeSchema>;
export type ServiceRecipeService = z.infer<typeof ServiceRecipeServiceSchema>;
export type ServiceRecipeLink = z.infer<typeof ServiceRecipeLinkSchema>;
