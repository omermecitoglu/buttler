"use server";
import { sql } from "drizzle-orm";
import db from "~/database";
import { globalVariables } from "~/database/schema/global-variables";

export async function setGlobalVariable(key: string, value: string) {
  await db
    .insert(globalVariables)
    .values({ key, value })
    .onConflictDoUpdate({
      target: globalVariables.key,
      set: { value: sql`excluded.value` },
    });
  return { success: true };
}
