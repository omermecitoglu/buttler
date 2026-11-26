import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { drizzle } from "drizzle-orm/node-sqlite";
import { migrate } from "drizzle-orm/node-sqlite/migrator";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { relations } from "~/database/relations";
import createService from "./createService";
import getDeployableService from "./getDeployableService";
import getService from "./getService";

describe("secrets of services", () => {
  let home: string;
  const client = new DatabaseSync(":memory:");
  const db = drizzle({ client, relations });
  migrate(db, { migrationsFolder: "drizzle" });

  beforeEach(() => {
    home = fs.mkdtempSync(path.join(os.tmpdir(), "buttler-service-"));
    vi.stubEnv("BUTTLER_HOME", home);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    fs.rmSync(home, { recursive: true, force: true });
  });

  it("should be encrypted, and only be readable for deployments", async () => {
    const { id } = createService(db, {
      name: "app",
      type: "github",
      repository: null,
      branch: null,
      internetAccess: true,
      environmentVariables: [
        { key: "URL", value: "http://localhost", scope: "both", isSecret: false },
        { key: "TOKEN", value: "hunter2", scope: "build", isSecret: true },
      ],
    });

    const stored = client.prepare("SELECT value FROM environment_variables WHERE key = 'TOKEN'").get();
    expect(stored?.value).toMatch(/^v1:/);

    const service = await getService(db, id);
    expect(service?.environmentVariables).toEqual(expect.arrayContaining([
      { serviceId: id, key: "URL", value: "http://localhost", scope: "both", isSecret: false },
      { serviceId: id, key: "TOKEN", value: null, scope: "build", isSecret: true },
    ]));

    const deployable = await getDeployableService(db, id);
    expect(deployable?.environmentVariables).toEqual(expect.arrayContaining([
      { serviceId: id, key: "URL", value: "http://localhost", scope: "both", isSecret: false },
      { serviceId: id, key: "TOKEN", value: "hunter2", scope: "build", isSecret: true },
    ]));
  });

  it("should leave variables without a scope at runtime", async () => {
    const { id } = createService(db, { name: "old", type: "github", repository: null, branch: null, internetAccess: true });
    client.prepare("INSERT INTO environment_variables (service_id, key, value) VALUES (?, 'A', 'B')").run(id);
    const service = await getDeployableService(db, id);
    expect(service?.environmentVariables).toEqual([
      { serviceId: id, key: "A", value: "B", scope: "runtime", isSecret: false },
    ]);
  });

  it("should return null for unknown services", async () => {
    expect(await getService(db, "unknown")).toBeNull();
    expect(await getDeployableService(db, "unknown")).toBeNull();
  });
});
