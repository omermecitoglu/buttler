import { relations } from "drizzle-orm";
import { text } from "drizzle-orm/sqlite-core/columns";
import { sqliteTable } from "drizzle-orm/sqlite-core/table";
import { services } from "./services";

export const networks = sqliteTable("networks", {
  id: text().primaryKey(),
  kind: text({
    enum: [
      "provider",
      "custom",
    ],
  }).notNull(),
  serviceId: text().notNull().references(() => services.id, { onDelete: "cascade", onUpdate: "restrict" }),
});

export const relationsOfNetworks = relations(networks, ({ one }) => ({
  service: one(services, {
    fields: [networks.serviceId],
    references: [services.id],
  }),
}));
