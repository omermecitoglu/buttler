import { eq } from "drizzle-orm";
import type database from "~/database";
import { settings } from "~/database/schema/settings";
import { CLOUDFLARE_TUNNEL_KEY } from "./getCloudflareTunnel";

export default async function deleteCloudflareTunnel(db: typeof database) {
  await db.delete(settings).where(eq(settings.key, CLOUDFLARE_TUNNEL_KEY));
}
