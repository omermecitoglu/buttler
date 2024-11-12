import { and, eq, notInArray, sql } from "drizzle-orm";
import type database from "~/database";
import { environmentVariables } from "~/database/schema/environment-variables";

export async function syncEnvironmentVariables(db: Omit<typeof database, "$client">, serviceId: string, record: Record<string, string>) {
  const filters = [
    eq(environmentVariables.serviceId, serviceId),
  ];
  if (Object.keys(record).length) {
    filters.push(notInArray(environmentVariables.key, Object.keys(record)));
  }
  await db.delete(environmentVariables).where(and(...filters));
  if (Object.keys(record).length) {
    await db.insert(environmentVariables).values(Object.keys(record).map(key => ({
      serviceId,
      key,
      value: record[key],
    }))).onConflictDoUpdate({
      target: [environmentVariables.serviceId, environmentVariables.key],
      set: { value: sql`excluded.value` },
    });
  }
}
