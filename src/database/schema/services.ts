import { sql } from "drizzle-orm";
import { snakeCase, text } from "drizzle-orm/sqlite-core";

export const services = snakeCase.table("services", {
  id: text().primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text().notNull(),
  type: text({ enum: ["github", "dockerhub", "system"] }).notNull(),
  repository: text(),
  branch: text(),
  createdAt: text().notNull().default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text().notNull().default(sql`(CURRENT_TIMESTAMP)`).$onUpdate(() => sql`(CURRENT_TIMESTAMP)`),
});
