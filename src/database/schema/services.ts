import { relations, sql } from "drizzle-orm";
import { text } from "drizzle-orm/sqlite-core/columns";
import { index } from "drizzle-orm/sqlite-core/indexes";
import { sqliteTable } from "drizzle-orm/sqlite-core/table";
import { environmentVariables } from "./environment-variables";
import { ports } from "./ports";

export const services = sqliteTable("services", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  repo: text("repo").notNull(),
  status: text("status", {
    enum: ["idle", "cloned", "building", "built", "ready"],
  }).notNull().default("idle"),
  imageId: text("image_id"),
  containerId: text("container_id"),
  createdAt: text("created_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text("updated_at").notNull().default(sql`(CURRENT_TIMESTAMP)`),
}, table => ({
  createdAtIdx: index("service_created_at_index").on(table.createdAt),
}));

export const relationsOfServices = relations(services, ({ many }) => ({
  environmentVariables: many(environmentVariables),
  ports: many(ports),
}));
