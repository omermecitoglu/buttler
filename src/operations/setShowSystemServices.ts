import type database from "~/database";
import { settings } from "~/database/schema/settings";
import { SHOW_SYSTEM_SERVICES_KEY } from "./getShowSystemServices";

/** Sets whether the services list shows the system services */
export default async function setShowSystemServices(db: typeof database, show: boolean) {
  const value = String(show);
  await db
    .insert(settings)
    .values({ key: SHOW_SYSTEM_SERVICES_KEY, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } });
}
