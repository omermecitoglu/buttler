import { relations } from "drizzle-orm";
import { text } from "drizzle-orm/sqlite-core/columns";
import { primaryKey } from "drizzle-orm/sqlite-core/primary-keys";
import { sqliteTable } from "drizzle-orm/sqlite-core/table";
import { services } from "./services";

export const environmentVariables = sqliteTable("environment_variables", {
  serviceId: text("service_id").notNull().references(() => services.id, { onDelete: "cascade", onUpdate: "restrict" }),
  key: text("key").notNull(),
  value: text("value").notNull(),
}, table => ({
  pk: primaryKey({ columns: [table.serviceId, table.key] }),
}));

export const relationsOfEnvironmentVariables = relations(environmentVariables, ({ one }) => ({
  service: one(services, {
    fields: [environmentVariables.serviceId],
    references: [services.id],
  }),
}));