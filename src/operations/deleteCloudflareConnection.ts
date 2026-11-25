import { eq } from "drizzle-orm";
import type database from "~/database";
import { settings } from "~/database/schema/settings";
import { CLOUDFLARE_CONNECTION_KEY } from "./getCloudflareConnection";

export default async function deleteCloudflareConnection(db: typeof database) {
  await db.delete(settings).where(eq(settings.key, CLOUDFLARE_CONNECTION_KEY));
}
