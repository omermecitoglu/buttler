import type database from "~/database";
import { ServiceDTO } from "~/models/service";
import { selectColumns } from "~/utils/column";
import type { z } from "zod";

const selectSchema = ServiceDTO.keyof().array().default([]);

export default function getServices(db: typeof database, select: z.infer<typeof selectSchema>) {
  return db.query.services.findMany({
    columns: selectColumns(select),
    orderBy: (u, { asc }) => [asc(u.createdAt)],
  });
}
