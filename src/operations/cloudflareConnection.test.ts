import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { drizzle } from "drizzle-orm/node-sqlite";
import { migrate } from "drizzle-orm/node-sqlite/migrator";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { relations } from "~/database/relations";
import { settings } from "~/database/schema/settings";
import deleteCloudflareConnection from "./deleteCloudflareConnection";
import getCloudflareConnection from "./getCloudflareConnection";
import saveCloudflareConnection from "./saveCloudflareConnection";

const client = new DatabaseSync(":memory:");
const db = drizzle({ client, relations });
migrate(db, { migrationsFolder: "drizzle" });

const tokens = { accessToken: "secret-access", refreshToken: "secret-refresh", expiresAt: 1000 };

describe("Cloudflare connection operations", () => {
  let home: string;

  beforeEach(async () => {
    home = fs.mkdtempSync(path.join(os.tmpdir(), "buttler-cloudflare-"));
    vi.stubEnv("BUTTLER_HOME", home);
    await db.delete(settings);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    fs.rmSync(home, { recursive: true, force: true });
  });

  it("should be disconnected at first", async () => {
    expect(await getCloudflareConnection(db)).toEqual({ state: "disconnected" });
  });

  it("should save, replace and delete the tokens", async () => {
    await saveCloudflareConnection(db, tokens);
    expect(await getCloudflareConnection(db)).toEqual({ state: "connected", tokens });
    await saveCloudflareConnection(db, { ...tokens, accessToken: "new" });
    expect(await getCloudflareConnection(db)).toMatchObject({ tokens: { accessToken: "new" } });
    await deleteCloudflareConnection(db);
    expect(await getCloudflareConnection(db)).toEqual({ state: "disconnected" });
  });

  it("should only store the tokens encrypted", async () => {
    await saveCloudflareConnection(db, tokens);
    const content = JSON.stringify(await db.query.settings.findMany());
    expect(content).not.toContain("secret-access");
    expect(content).not.toContain("secret-refresh");
  });

  it("should remember that the connection is lost", async () => {
    await saveCloudflareConnection(db, tokens);
    await saveCloudflareConnection(db, null);
    expect(await getCloudflareConnection(db)).toEqual({ state: "lost" });
  });

  it("should be lost if the tokens can't be decrypted", async () => {
    await saveCloudflareConnection(db, tokens);
    fs.rmSync(path.join(home, "secret.key"));
    expect(await getCloudflareConnection(db)).toEqual({ state: "lost" });
  });
});
