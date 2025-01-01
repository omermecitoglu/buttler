import type database from "~/database";
import type { BuildImageDTO } from "~/models/build-image";
import type { Prettify } from "~/types/prettify";
import { selectColumns } from "~/utils/column";
import type { z } from "zod";

export default async function getBuildImages<
  T extends keyof z.infer<typeof BuildImageDTO>,
>(db: typeof database, serviceId: string, select: T[]) {
  const output = await db.query.buildImages.findMany({
    columns: selectColumns(select),
    where: (table, { eq }) => eq(table.serviceId, serviceId),
    orderBy: (u, { desc }) => [desc(u.createdAt)],
  });
  return output as Prettify<Pick<typeof output[number], T>>[];
}
