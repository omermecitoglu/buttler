import type database from "~/database";

export const SHOW_SYSTEM_SERVICES_KEY = "show_system_services";

/** Returns whether the services list shows the system services, off by default */
export default async function getShowSystemServices(db: typeof database) {
  const setting = await db.query.settings.findFirst({
    where: { key: SHOW_SYSTEM_SERVICES_KEY },
  });
  return setting?.value === "true";
}
