import { sql } from "drizzle-orm";
import { integer, snakeCase, text } from "drizzle-orm/sqlite-core";
import { services } from "./services";

/** The public hostnames that are desired, one can only belong to a single service */
export const domains = snakeCase.table("domains", {
  hostname: text().primaryKey(),
  serviceId: text().notNull().references(() => services.id, { onDelete: "cascade", onUpdate: "restrict" }),
  /** Port of the container, it doesn't need to be published on the host */
  port: integer({ mode: "number" }).notNull(),
  createdAt: text().notNull().default(sql`(CURRENT_TIMESTAMP)`),
});
