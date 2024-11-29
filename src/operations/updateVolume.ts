import { eq } from "drizzle-orm";
import type database from "~/database";
import { volumes } from "~/database/schema/volumes";
import type { VolumePatchDTO } from "~/models/volume";
import type { z } from "zod";

export default async function updateVolume(db: typeof database, volumeId: string, patch: z.infer<typeof VolumePatchDTO>) {
  const results = await db.update(volumes)
    .set(patch)
    .where(eq(volumes.id, volumeId))
    .returning();
  return results.shift();
}
