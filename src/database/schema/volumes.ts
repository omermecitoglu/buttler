import { snakeCase, text } from "drizzle-orm/sqlite-core";
import { services } from "./services";

export const volumes = snakeCase.table("volumes", {
  id: text().primaryKey().$defaultFn(() => crypto.randomUUID()),
  serviceId: text().notNull().references(() => services.id, { onDelete: "cascade", onUpdate: "restrict" }),
  name: text().notNull(),
  containerPath: text().notNull(),
});
