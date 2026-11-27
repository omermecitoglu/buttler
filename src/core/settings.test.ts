import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { drizzle } from "drizzle-orm/node-sqlite";
import { migrate } from "drizzle-orm/node-sqlite/migrator";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { relations } from "~/database/relations";
import { settings } from "~/database/schema/settings";

const database = vi.hoisted(() => ({ current: null as unknown }));

vi.mock("server-only", () => ({}));
vi.mock("~/database", () => ({
  get default() {
    return database.current;
  },
}));

const { getSetting, isInstalled, secureStoredSettings, setSetting } = await import("./settings");
const { getSecretKeyPath } = await import("./secrets");

function createDatabase() {
  const db = drizzle({ client: new DatabaseSync(":memory:"), relations });
  migrate(db, { migrationsFolder: "drizzle" });
  return db;
}

describe("settings", () => {
  let home: string;
  let db: ReturnType<typeof createDatabase>;

  async function readStored(key: string) {
    const record = await db.query.settings.findFirst({ where: { key } });
    return record?.value ?? null;
  }

  beforeEach(() => {
    home = fs.mkdtempSync(path.join(os.tmpdir(), "buttler-settings-"));
    vi.stubEnv("BUTTLER_HOME", home);
    db = createDatabase();
    database.current = db;
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    fs.rmSync(home, { recursive: true, force: true });
  });

  it.each([
    "github_private_key",
    "github_client_secret",
    "github_webhook_secret",
    "session_password",
  ])("should encrypt %s in the database", async key => {
    await setSetting(key, "secret value");
    expect(await readStored(key)).toMatch(/^v1:/);
    expect(await readStored(key)).not.toContain("secret value");
    expect(await getSetting(key)).toBe("secret value");
  });

  it("should keep the other settings readable", async () => {
    await setSetting("github_client_id", "Iv1.abc");
    expect(await readStored("github_client_id")).toBe("Iv1.abc");
    expect(await getSetting("github_client_id")).toBe("Iv1.abc");
  });

  it("should not let a secret be moved to another setting", async () => {
    await setSetting("github_client_secret", "secret");
    const stored = await readStored("github_client_secret");
    await db.insert(settings).values({ key: "github_webhook_secret", value: stored! });
    expect(await getSetting("github_webhook_secret")).toBeNull();
  });

  it("should read and encrypt the plain values of older versions", async () => {
    await db.insert(settings).values([
      { key: "github_private_key", value: "-----BEGIN RSA PRIVATE KEY-----" },
      { key: "session_password", value: "password" },
    ]);
    expect(await getSetting("github_private_key")).toBe("-----BEGIN RSA PRIVATE KEY-----");

    await secureStoredSettings();

    expect(await readStored("github_private_key")).toMatch(/^v1:/);
    expect(await readStored("session_password")).toMatch(/^v1:/);
    expect(await getSetting("github_private_key")).toBe("-----BEGIN RSA PRIVATE KEY-----");
    expect(await getSetting("session_password")).toBe("password");
  });

  it("should go back to the GitHub App if its credentials can't be decrypted", async () => {
    await setSetting("installed", "true");
    await setSetting("github_app_id", "1");
    await setSetting("github_client_secret", "secret");
    await setSetting("github_private_key", "key");
    await setSetting("session_password", "password");
    // A new key replaces the lost one
    fs.rmSync(getSecretKeyPath());

    expect(await getSetting("github_client_secret")).toBeNull();
    await secureStoredSettings();

    expect(await isInstalled()).toBe(false);
    expect(await readStored("github_client_secret")).toBeNull();
    expect(await readStored("github_private_key")).toBeNull();
    expect(await getSetting("github_app_id")).toBe("1");
    // It's replaced on its first use
    expect(await getSetting("session_password")).toBeNull();
  });

  it("should leave a working installation as it is", async () => {
    await setSetting("installed", "true");
    await setSetting("github_client_secret", "secret");
    await secureStoredSettings();
    expect(await isInstalled()).toBe(true);
    expect(await getSetting("github_client_secret")).toBe("secret");
  });
});
