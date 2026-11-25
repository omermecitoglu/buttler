import { decryptSecret } from "~/core/secrets";
import type database from "~/database";
import { CloudflareTunnel } from "~/models/cloudflare";

/** Also binds the encrypted value to the setting */
export const CLOUDFLARE_TUNNEL_KEY = "cloudflare_tunnel";

/** The result has the decrypted token, so it must never be cached or sent to the browser */
export default async function getCloudflareTunnel(db: typeof database): Promise<CloudflareTunnel | null> {
  const setting = await db.query.settings.findFirst({
    where: { key: CLOUDFLARE_TUNNEL_KEY },
  });
  if (!setting) return null;
  try {
    return CloudflareTunnel.parse(JSON.parse(decryptSecret(setting.value, CLOUDFLARE_TUNNEL_KEY)));
  } catch {
    // It can't be used without its token, so a new tunnel is needed
    return null;
  }
}
