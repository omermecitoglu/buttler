import type database from "~/database";
import { ServiceDTO } from "~/models/service";
import { selectColumns } from "~/utils/column";
import type { z } from "zod";

const selectSchema = ServiceDTO.keyof();

export default async function getServices<K extends z.infer<typeof selectSchema>>(db: typeof database, select: K[]) {
  const result = await db.query.services.findMany({
    columns: selectColumns(select),
    orderBy: (u, { asc }) => [asc(u.createdAt)],
  });
  return result as Pick<typeof result[0], K>[];
}
