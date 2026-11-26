import { sql } from "drizzle-orm";
import { check, snakeCase, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { services } from "./services";

/**
 * A link lets two services reach each other, both of them can open connections.
 * The pair is stored in order (`serviceAId < serviceBId`), so there is at most one link per pair.
 */
export const serviceLinks = snakeCase.table("service_links", {
  id: text().primaryKey().$defaultFn(() => crypto.randomUUID()),
  serviceAId: text().notNull().references(() => services.id, { onDelete: "cascade", onUpdate: "restrict" }),
  serviceBId: text().notNull().references(() => services.id, { onDelete: "cascade", onUpdate: "restrict" }),
  createdAt: text().notNull().default(sql`(CURRENT_TIMESTAMP)`),
}, table => [
  uniqueIndex("service_links_pair_unique").on(table.serviceAId, table.serviceBId),
  check("service_links_ordered_pair", sql`${table.serviceAId} < ${table.serviceBId}`),
]);
