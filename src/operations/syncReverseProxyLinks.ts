import { and, eq, or } from "drizzle-orm";
import type database from "~/database";
import { domains } from "~/database/schema/domains";
import { serviceLinks } from "~/database/schema/service-links";
import { services } from "~/database/schema/services";
import { REVERSE_PROXY_SERVICE_NAME } from "./ensureReverseProxyService";
import { getLinkedServiceId } from "./getServiceLinks";

/**
 * Links nginx to the services that have a domain, and unlinks it from the others.
 * Only the given service is changed, or all of them without one.
 * Returns the IDs of the links that nginx has or had with them, so their networks can be synced.
 */
export default function syncReverseProxyLinks(db: typeof database, serviceId?: string): string[] {
  return db.transaction(tx => {
    const reverseProxy = tx.select({ id: services.id }).from(services)
      .where(and(eq(services.type, "system"), eq(services.name, REVERSE_PROXY_SERVICE_NAME)))
      .get();
    if (!reverseProxy) return [];
    const servicesWithDomains = new Set(tx.selectDistinct({ serviceId: domains.serviceId }).from(domains)
      .where(serviceId ? eq(domains.serviceId, serviceId) : undefined)
      .all()
      .map(row => row.serviceId));
    servicesWithDomains.delete(reverseProxy.id);
    const existingLinks = tx.select().from(serviceLinks)
      .where(or(eq(serviceLinks.serviceAId, reverseProxy.id), eq(serviceLinks.serviceBId, reverseProxy.id)))
      .all()
      .filter(link => !serviceId || getLinkedServiceId(link, reverseProxy.id) === serviceId);
    const linkedServices = new Set(existingLinks.map(link => getLinkedServiceId(link, reverseProxy.id)));

    for (const link of existingLinks) {
      if (servicesWithDomains.has(getLinkedServiceId(link, reverseProxy.id))) continue;
      tx.delete(serviceLinks).where(eq(serviceLinks.id, link.id)).run();
    }
    const createdLinks = [...servicesWithDomains].filter(id => !linkedServices.has(id)).flatMap(id => {
      const [serviceAId, serviceBId] = [reverseProxy.id, id].sort();
      return tx.insert(serviceLinks).values({ serviceAId, serviceBId }).onConflictDoNothing().returning().all();
    });
    return [...existingLinks, ...createdLinks].map(link => link.id);
  }, { behavior: "immediate" });
}
