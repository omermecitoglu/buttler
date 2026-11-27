import { primaryKey, snakeCase, text } from "drizzle-orm/sqlite-core";
import { DEVICE_KINDS } from "~/core/devices";
import { services } from "./services";

export const devices = snakeCase.table("devices", {
  serviceId: text().notNull().references(() => services.id, { onDelete: "cascade", onUpdate: "restrict" }),
  kind: text({ enum: DEVICE_KINDS }).notNull(),
}, table => [
  primaryKey({ columns: [table.serviceId, table.kind] }),
]);
