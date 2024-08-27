import type database from "~/database";
import { buildImages } from "~/database/schema/build-images";
import type { NewBuildImageDTO } from "~/models/build-image";
import type z from "zod";

export default async function createBuildImage(db: typeof database, data: z.infer<typeof NewBuildImageDTO>) {
  const [buildImage] = await db.insert(buildImages).values(data).returning({
    id: buildImages.id,
  });
  return buildImage;
}
