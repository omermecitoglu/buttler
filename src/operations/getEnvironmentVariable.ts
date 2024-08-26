import type database from "~/database";

export default function getEnvironmentVariable(db: typeof database, environmentVariableId: string) {
  return db.query.environmentVariables.findFirst({
    where: (table, { eq }) => eq(table.id, environmentVariableId),
  });
}
