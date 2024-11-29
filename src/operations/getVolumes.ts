import selectColumns from "~/core/column";
import type database from "~/database";
import { VolumeDTO } from "~/models/volume";
import type { z } from "zod";

const selectSchema = VolumeDTO.keyof().array().default([]);

export default function getVolumes(db: typeof database, select: z.infer<typeof selectSchema>) {
  return db.query.volumes.findMany({
    columns: selectColumns(select),
    orderBy: (u, { asc }) => [asc(u.createdAt)],
  });
}
