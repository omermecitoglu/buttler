import { eq } from "drizzle-orm";
import type database from "~/database";
import { sharedVariableNames } from "~/database/schema/shared-variables";

/** Returns the names that the services of a link give to the variables they inherit */
export default async function getSharedVariableNames(db: typeof database, linkId: string) {
  return await db.select().from(sharedVariableNames).where(eq(sharedVariableNames.linkId, linkId));
}
