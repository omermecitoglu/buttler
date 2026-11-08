import { sql } from "drizzle-orm";
import { snakeCase, text } from "drizzle-orm/sqlite-core";

export const settings = snakeCase.table("settings", {
  key: text().primaryKey(),
  value: text().notNull(),
  createdAt: text().notNull().default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text().notNull().default(sql`(CURRENT_TIMESTAMP)`).$onUpdate(() => sql`(CURRENT_TIMESTAMP)`),
});
