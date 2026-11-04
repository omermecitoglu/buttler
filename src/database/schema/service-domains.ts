import { relations } from "drizzle-orm";
import { text } from "drizzle-orm/sqlite-core/columns";
import { sqliteTable } from "drizzle-orm/sqlite-core/table";
import { services } from "./services";

export const serviceDomains = sqliteTable("service_domains", {
  id: text().primaryKey(),
  serviceId: text().notNull().references(() => services.id, { onDelete: "cascade", onUpdate: "restrict" }),
  name: text().notNull(),
});

export const relationsOfServiceDomains = relations(serviceDomains, ({ one }) => ({
  service: one(services, {
    fields: [serviceDomains.serviceId],
    references: [services.id],
  }),
}));
