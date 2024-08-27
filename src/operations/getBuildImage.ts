import type database from "~/database";

export default function getBuildImage(db: typeof database, buildImageId: string) {
  return db.query.buildImages.findFirst({
    where: (table, { eq }) => eq(table.id, buildImageId),
  });
}
