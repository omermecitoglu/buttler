import { relations } from "drizzle-orm";
import { integer, text } from "drizzle-orm/sqlite-core/columns";
import { primaryKey } from "drizzle-orm/sqlite-core/primary-keys";
import { sqliteTable } from "drizzle-orm/sqlite-core/table";
import { services } from "./services";

export const ports = sqliteTable("ports", {
  serviceId: text("service_id").notNull().references(() => services.id, { onDelete: "cascade", onUpdate: "restrict" }),
  external: integer("key", { mode: "number" }).notNull(),
  internal: integer("value", { mode: "number" }).notNull(),
}, table => ({
  pk: primaryKey({ columns: [table.serviceId, table.external] }),
}));

export const relationsOfPorts = relations(ports, ({ one }) => ({
  service: one(services, {
    fields: [ports.serviceId],
    references: [services.id],
  }),
}));
