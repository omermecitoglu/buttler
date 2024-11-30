import { relations } from "drizzle-orm";
import { text } from "drizzle-orm/sqlite-core/columns";
import { primaryKey } from "drizzle-orm/sqlite-core/primary-keys";
import { sqliteTable } from "drizzle-orm/sqlite-core/table";
import { services } from "./services";

export const serviceLinks = sqliteTable("service_links", {
  serviceId: text().notNull().references(() => services.id, { onDelete: "cascade", onUpdate: "restrict" }),
  providerId: text().notNull().references(() => services.id, { onDelete: "cascade", onUpdate: "restrict" }),
}, table => ({
  pk: primaryKey({ columns: [table.serviceId, table.providerId] }),
}));

export const relationsOfServiceLinks = relations(serviceLinks, ({ one }) => ({
  service: one(services, {
    fields: [serviceLinks.serviceId],
    references: [services.id],
    relationName: "service",
  }),
  provider: one(services, {
    fields: [serviceLinks.providerId],
    references: [services.id],
    relationName: "provider",
  }),
}));
