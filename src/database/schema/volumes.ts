import { relations } from "drizzle-orm";
import { text } from "drizzle-orm/sqlite-core/columns";
import { sqliteTable } from "drizzle-orm/sqlite-core/table";
import { services } from "./services";

export const volumes = sqliteTable("volumes", {
  id: text().primaryKey(),
  serviceId: text().notNull().references(() => services.id, { onDelete: "cascade", onUpdate: "restrict" }),
  containerPath: text().notNull(),
});

export const relationsOfVolumes = relations(volumes, ({ one }) => ({
  service: one(services, {
    fields: [volumes.serviceId],
    references: [services.id],
  }),
}));
