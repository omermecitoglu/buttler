import { eq } from "drizzle-orm";
import type database from "~/database";
import { environmentVariables } from "~/database/schema/environment-variables";
import type { EnvironmentVariablePatchDTO } from "~/models/environment-variable";
import type { z } from "zod";

export default async function updateEnvironmentVariable(db: typeof database, environmentVariableId: string, patch: z.infer<typeof EnvironmentVariablePatchDTO>) {
  const results = await db.update(environmentVariables)
    .set(patch)
    .where(eq(environmentVariables.id, environmentVariableId))
    .returning();
  return results.shift();
}
