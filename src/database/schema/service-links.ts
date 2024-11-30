import { relations } from "drizzle-orm";
import { text } from "drizzle-orm/sqlite-core/columns";
import { primaryKey } from "drizzle-orm/sqlite-core/primary-keys";
import { sqliteTable } from "drizzle-orm/sqlite-core/table";
import { services } from "./services";

export const serviceLinks = sqliteTable("service_links", {
  clientId: text().notNull().references(() => services.id, { onDelete: "cascade", onUpdate: "restrict" }),
  providerId: text().notNull().references(() => services.id, { onDelete: "cascade", onUpdate: "restrict" }),
}, table => ({
  pk: primaryKey({ columns: [table.clientId, table.providerId] }),
}));

export const relationsOfServiceLinks = relations(serviceLinks, ({ one }) => ({
  client: one(services, {
    fields: [serviceLinks.clientId],
    references: [services.id],
    relationName: "client",
  }),
  provider: one(services, {
    fields: [serviceLinks.providerId],
    references: [services.id],
    relationName: "provider",
  }),
}));
