import crypto from "node:crypto";
import type database from "~/database";
import { networks } from "~/database/schema/networks";

export default async function createNetwork(db: Omit<typeof database, "$client">, serviceId: string) {
  const [network] = await db.insert(networks).values({
    id: crypto.randomUUID(),
    serviceId,
  }).returning({ id: networks.id });
  return network;
}
