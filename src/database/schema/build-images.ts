import { relations, sql } from "drizzle-orm";
import { text } from "drizzle-orm/sqlite-core/columns";
import { index } from "drizzle-orm/sqlite-core/indexes";
import { sqliteTable } from "drizzle-orm/sqlite-core/table";
import { services } from "./services";

export const buildImages = sqliteTable("build_images", {
  id: text("id").primaryKey(),
  serviceId: text("service_id").notNull().references(() => services.id, { onDelete: "restrict", onUpdate: "restrict" }),
  status: text("status", { enum: ["pending", "canceled", "failed", "ready"] }).notNull().default("pending"),
  createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text("updated_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
}, table => ({
  createdAtIdx: index("build_image_created_at_index").on(table.createdAt),
}));

export const relationsOfBuildImages = relations(buildImages, ({ one }) => ({
  service: one(services, {
    fields: [buildImages.serviceId],
    references: [services.id],
  }),
}));
