import type database from "~/database";
import { services } from "~/database/schema/services";

export default async function ensureReverseProxyService(db: typeof database) {
  const existing = await db.query.services.findFirst({
    where: {
      type: "system",
      name: "Reverse Proxy Server",
    },
  });
  if (existing) {
    return existing;
  }
  const [created] = await db.insert(services).values({
    id: crypto.randomUUID(),
    name: "Reverse Proxy Server",
    type: "system",
    repository: "nginx",
    branch: "alpine",
  }).returning();
  return created;
}
