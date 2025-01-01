import { relations, sql } from "drizzle-orm";
import { text } from "drizzle-orm/sqlite-core/columns";
import { index } from "drizzle-orm/sqlite-core/indexes";
import { sqliteTable } from "drizzle-orm/sqlite-core/table";
import { services } from "./services";

export const buildImages = sqliteTable("build_images", {
  id: text().primaryKey(),
  serviceId: text().notNull().references(() => services.id, { onDelete: "restrict", onUpdate: "restrict" }),
  status: text({ enum: ["pending", "canceled", "failed", "ready"] }).notNull().default("pending"),
  errorCode: text({
    enum: [
      "REPO_NOT_FOUND",
    ],
  }),
  createdAt: text().notNull().default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text().notNull().default(sql`(CURRENT_TIMESTAMP)`),
}, table => ({
  createdAtIdx: index("build_image_created_at_index").on(table.createdAt),
}));

export const relationsOfBuildImages = relations(buildImages, ({ one }) => ({
  service: one(services, {
    fields: [buildImages.serviceId],
    references: [services.id],
  }),
}));
