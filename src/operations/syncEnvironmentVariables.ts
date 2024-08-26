import { and, eq, notInArray } from "drizzle-orm";
import type database from "~/database";
import { environmentVariables } from "~/database/schema/environment-variables";

export async function syncEnvironmentVariables(db: typeof database, serviceId: string, record: Record<string, string>) {
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
    }))).onConflictDoNothing({
      target: [environmentVariables.serviceId, environmentVariables.key],
    });
  }
}