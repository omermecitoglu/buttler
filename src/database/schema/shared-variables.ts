import { primaryKey, snakeCase, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { serviceLinks } from "./service-links";
import { services } from "./services";

/**
 * A variable that a service offers to its linked services.
 * The template refers to the service itself, see `src/core/shared-variables.ts`.
 */
export const sharedVariables = snakeCase.table("shared_variables", {
  id: text().primaryKey().$defaultFn(() => crypto.randomUUID()),
  serviceId: text().notNull().references(() => services.id, { onDelete: "cascade", onUpdate: "restrict" }),
  key: text().notNull(),
  template: text().notNull(),
}, table => [
  uniqueIndex("shared_variables_service_key_unique").on(table.serviceId, table.key),
]);

/**
 * The name that a linked service gives to an inherited variable.
 * Only renamed variables are stored, the others keep their key.
 */
export const sharedVariableNames = snakeCase.table("shared_variable_names", {
  linkId: text().notNull().references(() => serviceLinks.id, { onDelete: "cascade", onUpdate: "restrict" }),
  sharedVariableId: text().notNull().references(() => sharedVariables.id, { onDelete: "cascade", onUpdate: "restrict" }),
  name: text().notNull(),
}, table => [
  primaryKey({ columns: [table.linkId, table.sharedVariableId] }),
]);
