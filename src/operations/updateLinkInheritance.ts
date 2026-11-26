import { and, eq, inArray } from "drizzle-orm";
import type database from "~/database";
import { serviceLinks } from "~/database/schema/service-links";
import { sharedVariableNames, sharedVariables } from "~/database/schema/shared-variables";
import type { ServiceLinkDTO } from "~/models/service-link";
import { getLinkedServiceId } from "./getServiceLinks";

export type LinkInheritance = {
  inherits: boolean,
  /** The new names of the shared variables of the other side, the others keep their key */
  names: { sharedVariableId: string, name: string }[],
};

/** Sets what a service inherits through a link, returns nothing if the service isn't on that link */
export default function updateLinkInheritance(
  db: typeof database,
  serviceId: string,
  linkId: string,
  { inherits, names }: LinkInheritance,
): ServiceLinkDTO | undefined {
  return db.transaction(tx => {
    const link = tx.select().from(serviceLinks).where(eq(serviceLinks.id, linkId)).get();
    if (!link || (link.serviceAId !== serviceId && link.serviceBId !== serviceId)) return undefined;

    const updated = tx.update(serviceLinks)
      .set(link.serviceAId === serviceId ? { serviceAInherits: inherits } : { serviceBInherits: inherits })
      .where(eq(serviceLinks.id, linkId))
      .returning()
      .get();

    // Only the variables of the other side can be renamed on this side
    const otherVariableIds = tx.select({ id: sharedVariables.id }).from(sharedVariables)
      .where(eq(sharedVariables.serviceId, getLinkedServiceId(link, serviceId)))
      .all()
      .map(({ id }) => id);
    tx.delete(sharedVariableNames)
      .where(and(eq(sharedVariableNames.linkId, linkId), inArray(sharedVariableNames.sharedVariableId, otherVariableIds)))
      .run();
    const renamed = names.filter(({ sharedVariableId }) => otherVariableIds.includes(sharedVariableId));
    if (renamed.length > 0) {
      tx.insert(sharedVariableNames)
        .values(renamed.map(({ sharedVariableId, name }) => ({ linkId, sharedVariableId, name })))
        .run();
    }
    return updated;
  });
}
