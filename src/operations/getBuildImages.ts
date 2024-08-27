import type database from "~/database";
import { BuildImageDTO } from "~/models/build-image";
import { selectColumns } from "~/utils/column";
import type { z } from "zod";

const selectSchema = BuildImageDTO.keyof().array().default([]);

export default function getBuildImages(db: typeof database, select: z.infer<typeof selectSchema>) {
  return db.query.buildImages.findMany({
    columns: selectColumns(select),
    orderBy: (u, { asc }) => [asc(u.createdAt)],
  });
}
