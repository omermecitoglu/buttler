import selectColumns from "~/core/column";
import type database from "~/database";
import { EnvironmentVariableDTO } from "~/models/environment-variable";
import type { z } from "zod";

const selectSchema = EnvironmentVariableDTO.keyof().array().default([]);

export default function getEnvironmentVariables(db: typeof database, select: z.infer<typeof selectSchema>) {
  return db.query.environmentVariables.findMany({
    columns: selectColumns(select),
    orderBy: (u, { asc }) => [asc(u.createdAt)],
  });
}
