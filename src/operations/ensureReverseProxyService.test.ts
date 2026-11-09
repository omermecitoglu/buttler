import { DatabaseSync } from "node:sqlite";
import { drizzle } from "drizzle-orm/node-sqlite";
import { migrate } from "drizzle-orm/node-sqlite/migrator";
import { describe, expect, it } from "vitest";
import { relations } from "~/database/relations";
import ensureReverseProxyService from "./ensureReverseProxyService";

describe("ensureReverseProxyService", () => {
  it("creates the reverse proxy system service if it does not exist", async () => {
    const sqlite = new DatabaseSync(":memory:");
    const db = drizzle({ client: sqlite, relations });
    migrate(db, { migrationsFolder: "./drizzle" });

    const created = await ensureReverseProxyService(db);
    expect(created.name).toBe("Reverse Proxy Server");
    expect(created.type).toBe("system");
    expect(created.repository).toBe("nginx");
    expect(created.branch).toBe("alpine");

    const secondCall = await ensureReverseProxyService(db);
    expect(secondCall.id).toBe(created.id);

    const allServices = await db.query.services.findMany();
    expect(allServices).toHaveLength(1);

    sqlite.close();
  });
});
