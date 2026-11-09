import { primaryKey, snakeCase, text } from "drizzle-orm/sqlite-core";
import { services } from "./services";

export const environmentVariables = snakeCase.table("environment_variables", {
  serviceId: text().notNull().references(() => services.id, { onDelete: "cascade", onUpdate: "restrict" }),
  key: text().notNull(),
  value: text().notNull(),
}, table => [
  primaryKey({ columns: [table.serviceId, table.key] }),
]);
