import { integer, primaryKey, snakeCase, text } from "drizzle-orm/sqlite-core";
import { services } from "./services";

export const ports = snakeCase.table("ports", {
  serviceId: text().notNull().references(() => services.id, { onDelete: "cascade", onUpdate: "restrict" }),
  external: integer({ mode: "number" }).notNull(),
  internal: integer({ mode: "number" }).notNull(),
}, table => [
  primaryKey({ columns: [table.serviceId, table.external] }),
]);
