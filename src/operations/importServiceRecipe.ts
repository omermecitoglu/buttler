import { eq, inArray } from "drizzle-orm";
import { encryptSecret } from "~/core/secrets";
import type { ServiceRecipe } from "~/core/service-recipe";
import type database from "~/database";
import { devices as devicesTable } from "~/database/schema/devices";
import { domains as domainsTable } from "~/database/schema/domains";
import { environmentVariables as environmentVariablesTable } from "~/database/schema/environment-variables";
import { ports as portsTable } from "~/database/schema/ports";
import { serviceLinks } from "~/database/schema/service-links";
import { services as servicesTable } from "~/database/schema/services";
import { settings } from "~/database/schema/settings";
import { sharedVariableNames, sharedVariables as sharedVariablesTable } from "~/database/schema/shared-variables";
import { volumes as volumesTable } from "~/database/schema/volumes";
import { DASHBOARD_DOMAIN_KEY } from "./getDashboardDomain";
import getInheritedVariables from "./getInheritedVariables";
import { getSecretContext } from "./getSecretContext";

export type ServiceRecipeConflict =
  | { type: "name", name: string } |
  { type: "domain", hostname: string, owner: string | null } |
  { type: "port", port: number, owner: string };

export type ImportedService = {
  id: string,
  name: string,
  /** It has a secret, or inherits one, and its value is empty until the user fills it */
  hasSecrets: boolean,
};

export type ServiceRecipeImport =
  | { conflicts: ServiceRecipeConflict[] } |
  { services: ImportedService[] };

/**
 * Creates the services of a recipe with new IDs, the values of secrets are empty.
 * Nothing is created if a name, a domain or a published port is already taken.
 */
export default async function importServiceRecipe(db: typeof database, recipe: ServiceRecipe): Promise<ServiceRecipeImport> {
  const newIds = new Map(recipe.services.map(service => [service.id, crypto.randomUUID()]));

  const result = db.transaction((tx): ServiceRecipeImport => {
    const existing = tx.select({ id: servicesTable.id, name: servicesTable.name }).from(servicesTable).all();
    const existingNames = new Map(existing.map(({ id, name }) => [id, name]));
    const hostnames = recipe.services.flatMap(service => service.domains.map(({ hostname }) => hostname));
    const externalPorts = recipe.services.flatMap(service => service.ports.map(({ external }) => external));
    const dashboardDomain = tx.select().from(settings).where(eq(settings.key, DASHBOARD_DOMAIN_KEY)).get()?.value;
    const takenDomains = hostnames.length > 0
      ? tx.select().from(domainsTable).where(inArray(domainsTable.hostname, hostnames)).all()
      : [];
    const takenPorts = externalPorts.length > 0
      ? tx.select().from(portsTable).where(inArray(portsTable.external, externalPorts)).all()
      : [];

    const names = new Set(existingNames.values());
    const conflicts: ServiceRecipeConflict[] = [
      ...recipe.services.filter(({ name }) => names.has(name)).map(({ name }) => ({ type: "name" as const, name })),
      ...hostnames.filter(hostname => hostname === dashboardDomain).map(hostname => ({
        type: "domain" as const,
        hostname,
        owner: null,
      })),
      ...takenDomains.map(({ hostname, serviceId }) => ({
        type: "domain" as const,
        hostname,
        owner: existingNames.get(serviceId) ?? null,
      })),
      ...takenPorts.map(({ external, serviceId }) => ({
        type: "port" as const,
        port: external,
        owner: existingNames.get(serviceId) ?? "",
      })),
    ];
    if (conflicts.length > 0) return { conflicts };

    for (const service of recipe.services) {
      const serviceId = newIds.get(service.id)!;
      tx.insert(servicesTable).values({
        id: serviceId,
        name: service.name,
        type: service.type,
        repository: service.repository,
        branch: service.branch,
        internetAccess: service.internetAccess,
      }).run();
      if (service.devices.length > 0) {
        tx.insert(devicesTable).values([...new Set(service.devices)].map(kind => ({ serviceId, kind }))).run();
      }
      if (service.ports.length > 0) {
        tx.insert(portsTable).values(service.ports.map(port => ({ serviceId, ...port }))).run();
      }
      if (service.volumes.length > 0) {
        tx.insert(volumesTable).values(service.volumes.map(volume => ({ serviceId, ...volume }))).run();
      }
      if (service.environmentVariables.length > 0) {
        tx.insert(environmentVariablesTable).values(service.environmentVariables.map(({ key, value, scope, isSecret }) => ({
          serviceId,
          key,
          // Secrets are never exported, the user fills them in
          value: isSecret ? encryptSecret("", getSecretContext(serviceId, key)) : (value ?? ""),
          scope,
          isSecret,
        }))).run();
      }
      if (service.domains.length > 0) {
        tx.insert(domainsTable).values(service.domains.map(domain => ({ serviceId, ...domain }))).run();
      }
    }

    const sharedVariableIds = new Map<string, string>();
    for (const service of recipe.services) {
      if (service.sharedVariables.length === 0) continue;
      const created = tx.insert(sharedVariablesTable)
        .values(service.sharedVariables.map(variable => ({ serviceId: newIds.get(service.id)!, ...variable })))
        .returning()
        .all();
      for (const variable of created) {
        sharedVariableIds.set(`${service.id} ${variable.key}`, variable.id);
      }
    }

    for (const link of recipe.links) {
      const sides = link.services.map((id, index) => ({ id: newIds.get(id)!, inherits: link.inherits[index] }));
      // The pair is stored in order
      const [a, b] = sides.sort((first, second) => (first.id < second.id ? -1 : 1));
      const linkId = crypto.randomUUID();
      tx.insert(serviceLinks).values({
        id: linkId,
        serviceAId: a.id,
        serviceBId: b.id,
        serviceAInherits: a.inherits,
        serviceBInherits: b.inherits,
      }).run();
      if (link.names.length > 0) {
        tx.insert(sharedVariableNames).values(link.names.map(({ service, key, name }) => ({
          linkId,
          sharedVariableId: sharedVariableIds.get(`${service} ${key}`)!,
          name,
        }))).run();
      }
    }

    return { services: [] };
  }, { behavior: "immediate" });
  if ("conflicts" in result) return result;

  const services: ImportedService[] = [];
  for (const service of recipe.services) {
    const id = newIds.get(service.id)!;
    const inherited = await getInheritedVariables(db, id);
    services.push({
      id,
      name: service.name,
      hasSecrets: service.environmentVariables.some(({ isSecret }) => isSecret) || inherited.some(({ isSecret }) => isSecret),
    });
  }
  return { services };
}
