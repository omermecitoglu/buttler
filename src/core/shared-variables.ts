import type { ServiceEnvironmentVariable } from "./environment-variables";

/**
 * A shared variable is a template that refers to the service that shares it:
 * - `{host}`: its container name
 * - `{env.NAME}`: one of its runtime variables, an empty string when it isn't set
 * - `{env.NAME:-fallback}`: the same, with a fallback when it isn't set or empty
 * Anything else is kept as it is.
 */
const placeholderPattern = /\{(?:host|env\.([A-Za-z_][A-Za-z0-9_]*)(?::-([^}]*))?)\}/g;

const bracePattern = /\{[^{}]*\}/g;

export type SharedVariableSource = {
  host: string,
  /** `null` values are secrets that can't be read, e.g. in a preview */
  variables: (Pick<ServiceEnvironmentVariable, "key" | "scope" | "isSecret"> & { value: string | null })[],
};

export type ResolvedTemplate = {
  value: string,
  /** A value that is built from a secret is a secret too */
  isSecret: boolean,
  /** Referenced variables that aren't set and have no fallback */
  unset: string[],
};

export type TemplateReference = {
  name: string,
  hasFallback: boolean,
};

/** The container name of a service, which its linked services can reach */
export function getServiceHost(serviceId: string) {
  return `buttler-service-${serviceId}`;
}

/** Variables of the service that are referred to with `{env.NAME}` */
export function getTemplateReferences(template: string): TemplateReference[] {
  return Array.from(template.matchAll(placeholderPattern)).flatMap(match => {
    // Groups that don't take part in the match are undefined
    const [, name, fallback] = match as (string | undefined)[];
    return name ? [{ name, hasFallback: fallback !== undefined }] : [];
  });
}

/** Braces that look like placeholders but aren't one, e.g. a typo like `{hots}` */
export function getUnknownPlaceholders(template: string) {
  return Array.from(template.matchAll(bracePattern), ([match]) => match)
    .filter(match => !new RegExp(`^${placeholderPattern.source}$`).test(match));
}

/**
 * Resolves a template with the runtime variables of the service that shares it.
 * Secrets with a `null` value are replaced with `mask`.
 */
export function resolveTemplate(template: string, source: SharedVariableSource, mask = ""): ResolvedTemplate {
  const runtimeVariables = new Map(source.variables
    .filter(({ scope }) => scope === "runtime" || scope === "both")
    .map(variable => [variable.key, variable]));
  const unset = new Set<string>();
  let isSecret = false;
  const value = template.replace(placeholderPattern, (match, name: string | undefined, fallback: string | undefined) => {
    if (!name) return source.host;
    const variable = runtimeVariables.get(name);
    if (!variable) {
      if (fallback !== undefined) return fallback;
      unset.add(name);
      return "";
    }
    if (variable.value === null) {
      isSecret = true;
      return mask;
    }
    if (!variable.value && fallback !== undefined) return fallback;
    if (variable.isSecret) isSecret = true;
    return variable.value;
  });
  return { value, isSecret, unset: Array.from(unset) };
}
