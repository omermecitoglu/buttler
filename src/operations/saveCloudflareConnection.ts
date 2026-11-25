import { encryptSecret } from "~/core/secrets";
import type database from "~/database";
import { settings } from "~/database/schema/settings";
import type { CloudflareTokens } from "~/models/cloudflare";
import { CLOUDFLARE_CONNECTION_KEY } from "./getCloudflareConnection";

/** Saves the encrypted tokens, or a lost connection if there are none */
export default async function saveCloudflareConnection(db: typeof database, tokens: CloudflareTokens | null) {
  const value = encryptSecret(JSON.stringify(tokens), CLOUDFLARE_CONNECTION_KEY);
  await db.insert(settings)
    .values({ key: CLOUDFLARE_CONNECTION_KEY, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } });
}
