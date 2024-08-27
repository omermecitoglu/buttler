import { eq } from "drizzle-orm";
import type database from "~/database";
import { buildImages } from "~/database/schema/build-images";

export default async function deleteBuildImage(db: typeof database, buildImageId: string) {
  const results = await db.delete(buildImages).where(eq(buildImages.id, buildImageId)).returning({
    id: buildImages.id,
  });
  return results.shift();
}
