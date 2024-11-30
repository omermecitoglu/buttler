import { text } from "drizzle-orm/sqlite-core/columns";
import { sqliteTable } from "drizzle-orm/sqlite-core/table";

export const globalVariables = sqliteTable("global_variables", {
  key: text().primaryKey(),
  value: text().notNull(),
});
