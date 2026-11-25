import type database from "~/database";
import { services } from "~/database/schema/services";
import getTunnelService, { TUNNEL_SERVICE_NAME } from "./getTunnelService";

export default async function ensureTunnelService(db: typeof database) {
  const existing = await getTunnelService(db);
  if (existing) return existing;
  const [created] = await db.insert(services).values({
    id: crypto.randomUUID(),
    name: TUNNEL_SERVICE_NAME,
    type: "system",
    repository: "cloudflare/cloudflared",
    branch: "latest",
  }).returning();
  return created;
}
