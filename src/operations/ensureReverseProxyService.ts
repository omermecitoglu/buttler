import type database from "~/database";
import { services } from "~/database/schema/services";

export const REVERSE_PROXY_SERVICE_NAME = "Reverse Proxy Server";

export default async function ensureReverseProxyService(db: typeof database) {
  const existing = await db.query.services.findFirst({
    where: {
      type: "system",
      name: REVERSE_PROXY_SERVICE_NAME,
    },
  });
  if (existing) {
    return existing;
  }
  const [created] = await db.insert(services).values({
    id: crypto.randomUUID(),
    name: REVERSE_PROXY_SERVICE_NAME,
    type: "system",
    repository: "nginx",
    branch: "alpine",
  }).returning();
  return created;
}
