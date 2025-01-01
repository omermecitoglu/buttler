import { eq } from "drizzle-orm";
import type database from "~/database";
import { buildImages } from "~/database/schema/build-images";
import type { BuildImagePatchDTO } from "~/models/build-image";

export default async function updateBuildImage(db: typeof database, buildImageId: string, patch: BuildImagePatchDTO) {
  const results = await db.update(buildImages)
    .set(patch)
    .where(eq(buildImages.id, buildImageId))
    .returning();
  return results.shift();
}
