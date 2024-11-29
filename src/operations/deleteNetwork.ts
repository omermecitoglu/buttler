import { eq } from "drizzle-orm";
import type database from "~/database";
import { networks } from "~/database/schema/networks";

export default async function deleteNetwork(db: typeof database, networkId: string) {
  const results = await db.delete(networks).where(eq(networks.id, networkId)).returning({
    id: networks.id,
  });
  return results.shift();
}
