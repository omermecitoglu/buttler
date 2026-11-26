import { eq } from "drizzle-orm";
import type database from "~/database";
import { services } from "~/database/schema/services";

/** Services that aren't found have no internet access */
export default async function hasInternetAccess(db: typeof database, serviceId: string) {
  const rows = await db.select({ internetAccess: services.internetAccess }).from(services).where(eq(services.id, serviceId));
  return rows.at(0)?.internetAccess ?? false;
}
