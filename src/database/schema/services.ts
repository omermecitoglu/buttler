import { relations, sql } from "drizzle-orm";
import { integer, text } from "drizzle-orm/sqlite-core/columns";
import { index } from "drizzle-orm/sqlite-core/indexes";
import { sqliteTable } from "drizzle-orm/sqlite-core/table";
import { buildImages } from "./build-images";
import { environmentVariables } from "./environment-variables";
import { networks } from "./networks";
import { ports } from "./ports";
import { serviceDomains } from "./service-domains";
import { serviceLinks } from "./service-links";
import { volumes } from "./volumes";

export const services = sqliteTable("services", {
  id: text().primaryKey(),
  kind: text({
    enum: [
      "system",
      "git",
      "database",
    ],
  }).notNull(),
  name: text().notNull(),
  repo: text().notNull(),
  status: text({
    enum: [
      "idle",
      "running",
    ],
  }).notNull().default("idle"),
  imageId: text(),
  containerId: text(),
  mainPort: integer({ mode: "number" }),
  createdAt: text().notNull().default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text().notNull().default(sql`(CURRENT_TIMESTAMP)`),
}, table => ({
  createdAtIdx: index("service_created_at_index").on(table.createdAt),
}));

export const relationsOfServices = relations(services, ({ many }) => ({
  environmentVariables: many(environmentVariables),
  ports: many(ports),
  buildImages: many(buildImages),
  volumes: many(volumes),
  networks: many(networks),
  providerlinks: many(serviceLinks, { relationName: "client" }),
  clientLinks: many(serviceLinks, { relationName: "provider" }),
  domains: many(serviceDomains),
}));
