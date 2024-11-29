import { eq } from "drizzle-orm";
import type database from "~/database";
import { volumes } from "~/database/schema/volumes";

export default async function deleteVolume(db: typeof database, volumeId: string) {
  const results = await db.delete(volumes).where(eq(volumes.id, volumeId)).returning({
    id: volumes.id,
  });
  return results.shift();
}
