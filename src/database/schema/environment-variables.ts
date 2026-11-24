import { integer, primaryKey, snakeCase, text } from "drizzle-orm/sqlite-core";
import { environmentVariableScopes } from "../../core/environment-variables";
import { services } from "./services";

export const environmentVariables = snakeCase.table("environment_variables", {
  serviceId: text().notNull().references(() => services.id, { onDelete: "cascade", onUpdate: "restrict" }),
  key: text().notNull(),
  value: text().notNull(),
  scope: text({ enum: environmentVariableScopes }).notNull().default("runtime"),
  isSecret: integer({ mode: "boolean" }).notNull().default(false),
}, table => [
  primaryKey({ columns: [table.serviceId, table.key] }),
]);
