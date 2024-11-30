import type database from "~/database";
import { ServiceDTO } from "~/models/service";
import type { Prettify } from "~/types/prettify";
import { selectColumns } from "~/utils/column";
import type { z } from "zod";

const selectSchema = ServiceDTO.keyof();

export default async function getServices<K extends z.infer<typeof selectSchema>>(db: typeof database, select: K[]) {
  const result = await db.query.services.findMany({
    with: {
      environmentVariables: {
        columns: {
          key: true,
          value: true,
        },
      },
      ports: {
        columns: {
          external: true,
          internal: true,
        },
      },
    },
    columns: selectColumns(select),
    orderBy: (u, { asc }) => [asc(u.createdAt)],
  });
  return result as unknown as Prettify<Pick<z.infer<typeof ServiceDTO>, K>>[];
}
