import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { drizzle } from "drizzle-orm/node-sqlite";
import { migrate } from "drizzle-orm/node-sqlite/migrator";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { relations } from "~/database/relations";
import { services } from "~/database/schema/services";
import { settings } from "~/database/schema/settings";
import deleteCloudflareTunnel from "./deleteCloudflareTunnel";
import ensureTunnelService from "./ensureTunnelService";
import getCloudflareTunnel from "./getCloudflareTunnel";
import getTunnelService from "./getTunnelService";
import saveCloudflareTunnel from "./saveCloudflareTunnel";

const client = new DatabaseSync(":memory:");
const db = drizzle({ client, relations });
migrate(db, { migrationsFolder: "drizzle" });

const tunnel = { id: "tunnel", accountId: "acc", token: "secret-token" };

describe("Cloudflare tunnel operations", () => {
  let home: string;

  beforeEach(async () => {
    home = fs.mkdtempSync(path.join(os.tmpdir(), "buttler-tunnel-"));
    vi.stubEnv("BUTTLER_HOME", home);
    await db.delete(settings);
    await db.delete(services);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    fs.rmSync(home, { recursive: true, force: true });
  });

  it("should save, replace and delete the tunnel", async () => {
    expect(await getCloudflareTunnel(db)).toBeNull();
    await saveCloudflareTunnel(db, { ...tunnel, token: null });
    expect(await getCloudflareTunnel(db)).toEqual({ ...tunnel, token: null });
    await saveCloudflareTunnel(db, tunnel);
    expect(await getCloudflareTunnel(db)).toEqual(tunnel);
    await deleteCloudflareTunnel(db);
    expect(await getCloudflareTunnel(db)).toBeNull();
  });

  it("should only store the token encrypted", async () => {
    await saveCloudflareTunnel(db, tunnel);
    expect(JSON.stringify(await db.query.settings.findMany())).not.toContain("secret-token");
  });

  it("should not have a tunnel if it can't be decrypted", async () => {
    await saveCloudflareTunnel(db, tunnel);
    fs.rmSync(path.join(home, "secret.key"));
    expect(await getCloudflareTunnel(db)).toBeNull();
  });

  it("should only create one service", async () => {
    expect(await getTunnelService(db)).toBeUndefined();
    const { id } = await ensureTunnelService(db);
    expect((await ensureTunnelService(db)).id).toBe(id);
    expect(await getTunnelService(db)).toMatchObject({ id, type: "system" });
  });
});
