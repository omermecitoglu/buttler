import type database from "~/database";

export default function getVolume(db: typeof database, volumeId: string) {
  return db.query.volumes.findFirst({
    where: (table, { eq }) => eq(table.id, volumeId),
  });
}
