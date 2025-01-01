import crypto from "node:crypto";
import type database from "~/database";
import { buildImages } from "~/database/schema/build-images";
import type { NewBuildImageDTO } from "~/models/build-image";

export default async function createBuildImage(db: typeof database, data: NewBuildImageDTO) {
  const [buildImage] = await db.insert(buildImages).values({
    id: crypto.randomUUID(),
    ...data,
  }).returning({
    id: buildImages.id,
  });
  return buildImage;
}
