import { and, inArray } from "drizzle-orm";
import { SERVICE_RECIPE_VERSION, type ServiceRecipe } from "~/core/service-recipe";
import type database from "~/database";
import { serviceLinks } from "~/database/schema/service-links";
import { sharedVariableNames } from "~/database/schema/shared-variables";

/**
 * Returns what is needed to rebuild the chosen services on another Buttler.
 * System services, secret values and the links to services that aren't chosen are left out.
 */
export default async function getServiceRecipe(db: typeof database, serviceIds: string[]): Promise<ServiceRecipe> {
  const services = await db.query.services.findMany({
    where: {
      id: { in: serviceIds },
      type: { ne: "system" },
    },
    with: {
      ports: true,
      volumes: true,
      environmentVariables: true,
      devices: true,
      domains: true,
      sharedVariables: true,
    },
    orderBy: { createdAt: "asc" },
  });
  const ids = services.map(service => service.id);

  const links = await db.select().from(serviceLinks)
    .where(and(inArray(serviceLinks.serviceAId, ids), inArray(serviceLinks.serviceBId, ids)))
    .orderBy(serviceLinks.createdAt, serviceLinks.id);
  const names = await db.select().from(sharedVariableNames)
    .where(inArray(sharedVariableNames.linkId, links.map(link => link.id)));
  const sharedVariables = new Map(services.flatMap(service => service.sharedVariables)
    .map(variable => [variable.id, variable]));

  return {
    version: SERVICE_RECIPE_VERSION,
    services: services.map(service => ({
      id: service.id,
      name: service.name,
      type: service.type as "github" | "dockerhub",
      repository: service.repository,
      branch: service.branch,
      internetAccess: service.internetAccess,
      devices: service.devices.map(({ kind }) => kind),
      ports: service.ports.map(({ external, internal }) => ({ external, internal })),
      volumes: service.volumes.map(({ name, containerPath }) => ({ name, containerPath })),
      environmentVariables: service.environmentVariables.map(({ key, value, scope, isSecret }) => ({
        key,
        value: isSecret ? null : value,
        scope,
        isSecret,
      })),
      domains: service.domains.map(({ hostname, port }) => ({ hostname, port })),
      sharedVariables: service.sharedVariables.map(({ key, template }) => ({ key, template })),
    })),
    links: links.map(link => ({
      services: [link.serviceAId, link.serviceBId],
      inherits: [link.serviceAInherits, link.serviceBInherits],
      names: names.filter(name => name.linkId === link.id).flatMap(name => {
        const variable = sharedVariables.get(name.sharedVariableId);
        return variable ? [{ service: variable.serviceId, key: variable.key, name: name.name }] : [];
      }),
    })),
  };
}
