import type database from "~/database";
import { serviceLinks } from "~/database/schema/service-links";
import type { ServiceLinkDTO } from "~/models/service-link";

/** Links two services, returns nothing if they are the same service or already linked. The ID restores a removed link. */
export default async function createServiceLink(
  db: typeof database,
  serviceId: string,
  otherServiceId: string,
  id?: ServiceLinkDTO["id"],
): Promise<ServiceLinkDTO | undefined> {
  if (serviceId === otherServiceId) return undefined;
  const [serviceAId, serviceBId] = [serviceId, otherServiceId].sort();
  const [link] = await db.insert(serviceLinks)
    .values({ id, serviceAId, serviceBId })
    .onConflictDoNothing()
    .returning();
  return link;
}
