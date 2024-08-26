import { relations, sql } from "drizzle-orm";
import { text } from "drizzle-orm/sqlite-core/columns";
import { index } from "drizzle-orm/sqlite-core/indexes";
import { sqliteTable } from "drizzle-orm/sqlite-core/table";
import { services } from "./services";

export const environmentVariables = sqliteTable("environment_variables", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  value: text("value").notNull(),
  serviceId: text("service_id").notNull().references(() => services.id, { onDelete: "cascade", onUpdate: "restrict" }),
  createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text("updated_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
}, table => ({
  createdAtIdx: index("env_created_at_index").on(table.createdAt),
}));

export const relationsOfEnvironmentVariables = relations(environmentVariables, ({ one }) => ({
  service: one(services, {
    fields: [environmentVariables.serviceId],
    references: [services.id],
  }),
}));
