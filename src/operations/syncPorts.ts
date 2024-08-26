import { and, eq, notInArray, sql } from "drizzle-orm";
import type database from "~/database";
import { ports } from "~/database/schema/ports";

export async function syncPorts(db: typeof database, serviceId: string, record: Record<string, string>) {
  const filters = [
    eq(ports.serviceId, serviceId),
  ];
  if (Object.keys(record).length) {
    filters.push(notInArray(ports.external, Object.keys(record).map(key => parseInt(key))));
  }
  await db.delete(ports).where(and(...filters));
  if (Object.keys(record).length) {
    await db.insert(ports).values(Object.keys(record).map(key => ({
      serviceId,
      external: parseInt(key),
      internal: parseInt(record[key]),
    }))).onConflictDoUpdate({
      target: [ports.serviceId, ports.external],
      set: { internal: sql`excluded.value` },
    });
  }
}
