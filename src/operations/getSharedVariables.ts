import { asc, eq } from "drizzle-orm";
import type database from "~/database";
import { sharedVariables } from "~/database/schema/shared-variables";

/** Returns the variables that a service offers to its linked services */
export default async function getSharedVariables(db: typeof database, serviceId: string) {
  return await db.select().from(sharedVariables)
    .where(eq(sharedVariables.serviceId, serviceId))
    .orderBy(asc(sharedVariables.key));
}
