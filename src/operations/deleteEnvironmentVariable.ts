import { eq } from "drizzle-orm";
import type database from "~/database";
import { environmentVariables } from "~/database/schema/environment-variables";

export default async function deleteEnvironmentVariable(db: typeof database, environmentVariableId: string) {
  const results = await db.delete(environmentVariables).where(eq(environmentVariables.id, environmentVariableId)).returning({
    id: environmentVariables.id,
  });
  return results.shift();
}
