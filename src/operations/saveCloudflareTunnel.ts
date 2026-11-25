import { encryptSecret } from "~/core/secrets";
import type database from "~/database";
import { settings } from "~/database/schema/settings";
import type { CloudflareTunnel } from "~/models/cloudflare";
import { CLOUDFLARE_TUNNEL_KEY } from "./getCloudflareTunnel";

export default async function saveCloudflareTunnel(db: typeof database, tunnel: CloudflareTunnel) {
  const value = encryptSecret(JSON.stringify(tunnel), CLOUDFLARE_TUNNEL_KEY);
  await db.insert(settings)
    .values({ key: CLOUDFLARE_TUNNEL_KEY, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } });
}
