import { and, eq, notInArray } from "drizzle-orm";
import type database from "~/database";
import { sharedVariables } from "~/database/schema/shared-variables";
import type { SharedVariableDTO } from "~/models/shared-variable";

export type SavedSharedVariable = {
  /** Keeps the names that the linked services give to it, a new variable has none */
  id?: SharedVariableDTO["id"],
  key: string,
  template: string,
};

/** Replaces the shared variables of a service, the ones with an ID are updated in place */
export default function saveSharedVariables(db: typeof database, serviceId: string, variables: SavedSharedVariable[]) {
  return db.transaction(tx => {
    const keptIds = variables.flatMap(({ id }) => (id ? [id] : []));
    tx.delete(sharedVariables)
      .where(and(eq(sharedVariables.serviceId, serviceId), notInArray(sharedVariables.id, keptIds)))
      .run();
    // A key can move from one variable to another, so the kept ones get temporary keys first
    for (const id of keptIds) {
      tx.update(sharedVariables)
        .set({ key: `\0${id}` })
        .where(and(eq(sharedVariables.id, id), eq(sharedVariables.serviceId, serviceId)))
        .run();
    }
    for (const { id, key, template } of variables) {
      if (id) {
        tx.update(sharedVariables)
          .set({ key, template })
          .where(and(eq(sharedVariables.id, id), eq(sharedVariables.serviceId, serviceId)))
          .run();
      } else {
        tx.insert(sharedVariables).values({ serviceId, key, template }).run();
      }
    }
    return tx.select().from(sharedVariables).where(eq(sharedVariables.serviceId, serviceId)).all();
  });
}
