import type database from "~/database";
import { environmentVariables } from "~/database/schema/environment-variables";
import type { NewEnvironmentVariableDTO } from "~/models/environment-variable";
import type z from "zod";

export default async function createEnvironmentVariable(db: typeof database, data: z.infer<typeof NewEnvironmentVariableDTO>) {
  const [environmentVariable] = await db.insert(environmentVariables).values(data).returning({ id: environmentVariables.id });
  return environmentVariable;
}
