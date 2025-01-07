import crypto from "node:crypto";
import { createInsertSchema } from "drizzle-zod";
import type database from "~/database";
import { networks } from "~/database/schema/networks";
import type { z } from "zod";

const schema = createInsertSchema(networks);

type NetworkDTO = z.infer<typeof schema>;

export default async function createNetwork(db: Omit<typeof database, "$client">, serviceId: string, kind: NetworkDTO["kind"]) {
  const [network] = await db.insert(networks).values({
    id: crypto.randomUUID(),
    kind,
    serviceId,
  }).returning({ id: networks.id });
  return network;
}
