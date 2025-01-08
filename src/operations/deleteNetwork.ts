import { eq } from "drizzle-orm";
import type database from "~/database";
import { networks } from "~/database/schema/networks";

export default async function deleteNetwork(db: Omit<typeof database, "$client">, networkId: string) {
  const results = await db.delete(networks).where(eq(networks.id, networkId)).returning({
    id: networks.id,
    serviceId: networks.serviceId,
  });
  const output = results.shift();
  if (!output) throw new Error("not found");
  return output;
}
