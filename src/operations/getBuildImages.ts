import type database from "~/database";
import { BuildImageDTO } from "~/models/build-image";
import { selectColumns } from "~/utils/column";
import type { z } from "zod";

const selectSchema = BuildImageDTO.keyof().array().default([]);

export default function getBuildImages(db: typeof database, serviceId: string, select: z.infer<typeof selectSchema>) {
  return db.query.buildImages.findMany({
    columns: selectColumns(select),
    where: (table, { eq }) => eq(table.serviceId, serviceId),
    orderBy: (u, { asc }) => [asc(u.createdAt)],
  });
}
