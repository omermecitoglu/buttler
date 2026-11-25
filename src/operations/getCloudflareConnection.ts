import z from "zod";
import { decryptSecret } from "~/core/secrets";
import type database from "~/database";
import { CloudflareTokens } from "~/models/cloudflare";

/** Also binds the encrypted value to the setting */
export const CLOUDFLARE_CONNECTION_KEY = "cloudflare_connection";

/** It's lost if Cloudflare doesn't accept the tokens anymore, or if they can't be read */
export type CloudflareConnection = { state: "connected", tokens: CloudflareTokens } | { state: "disconnected" | "lost" };

/** The result has the decrypted tokens, so it must never be cached or sent to the browser */
export default async function getCloudflareConnection(db: typeof database): Promise<CloudflareConnection> {
  const setting = await db.query.settings.findFirst({
    where: { key: CLOUDFLARE_CONNECTION_KEY },
  });
  if (!setting) return { state: "disconnected" };
  try {
    const content: unknown = JSON.parse(decryptSecret(setting.value, CLOUDFLARE_CONNECTION_KEY));
    const tokens = z.nullable(CloudflareTokens).parse(content);
    return tokens ? { state: "connected", tokens } : { state: "lost" };
  } catch {
    return { state: "lost" };
  }
}
