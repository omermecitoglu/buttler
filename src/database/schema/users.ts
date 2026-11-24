import { sql } from "drizzle-orm";
import { integer, snakeCase, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/** The people who have access to the instance */
export const users = snakeCase.table("users", {
  /** GitHub user ID, handles can be changed and then taken by someone else */
  id: integer({ mode: "number" }).primaryKey(),
  login: text().notNull(),
  avatar: text().notNull(),
  role: text({ enum: ["admin"] }).notNull(),
  createdAt: text().notNull().default(sql`(CURRENT_TIMESTAMP)`),
}, table => [
  // There is only one admin, even if two people log in to a new instance at the same time
  uniqueIndex("users_single_admin").on(table.role).where(sql`role = 'admin'`),
]);
