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
import updateService, { MissingSecretValueError } from "./updateService";

describe("updateService", () => {
  let home: string;
  let serviceId: string;
  const client = new DatabaseSync(":memory:");
  const db = drizzle({ client, relations });
  migrate(db, { migrationsFolder: "drizzle" });

  const base = { name: "app", repository: "owner/app", branch: "main", ports: [], environmentVariables: [], volumes: [] };

  beforeEach(() => {
    home = fs.mkdtempSync(path.join(os.tmpdir(), "buttler-service-"));
    vi.stubEnv("BUTTLER_HOME", home);
    serviceId = createService(db, {
      ...base,
      type: "github",
      ports: [{ external: 8080, internal: 80 }],
      environmentVariables: [{ key: "TOKEN", value: "hunter2", scope: "runtime", isSecret: true }],
      volumes: [{ name: "data", containerPath: "/data" }],
    }).id;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    fs.rmSync(home, { recursive: true, force: true });
  });

  it("should replace the definition of the service", async () => {
    updateService(db, serviceId, {
      ...base,
      name: "renamed",
      branch: "next",
      ports: [{ external: 8080, internal: 3000 }],
      environmentVariables: [{ key: "URL", value: "http://localhost", scope: "both", isSecret: false }],
      volumes: [{ name: "data", containerPath: "/var/data" }],
    });
    expect(await getDeployableService(db, serviceId)).toMatchObject({
      name: "renamed",
      type: "github",
      branch: "next",
      ports: [{ external: 8080, internal: 3000 }],
      environmentVariables: [{ key: "URL", value: "http://localhost", scope: "both", isSecret: false }],
      volumes: [{ name: "data", containerPath: "/var/data" }],
    });
  });

  it("should only change the given parts", async () => {
    updateService(db, serviceId, { ports: [{ external: 9090, internal: 80 }] });
    updateService(db, serviceId, { name: "renamed" });
    expect(await getDeployableService(db, serviceId)).toMatchObject({
      name: "renamed",
      repository: "owner/app",
      branch: "main",
      ports: [{ external: 9090, internal: 80 }],
      environmentVariables: [{ key: "TOKEN", value: "hunter2" }],
      volumes: [{ name: "data", containerPath: "/data" }],
    });
  });

  it("should keep the secrets that are left untouched", async () => {
    updateService(db, serviceId, {
      ...base,
      environmentVariables: [{ key: "TOKEN", value: null, scope: "both", isSecret: true }],
    });
    const service = await getDeployableService(db, serviceId);
    expect(service?.environmentVariables).toEqual([
      { serviceId, key: "TOKEN", value: "hunter2", scope: "both", isSecret: true },
    ]);
  });

  it("should encrypt the new values of secrets", async () => {
    updateService(db, serviceId, {
      ...base,
      environmentVariables: [{ key: "TOKEN", value: "rotated", scope: "runtime", isSecret: true }],
    });
    const stored = client.prepare("SELECT value FROM environment_variables WHERE service_id = ?").get(serviceId);
    expect(stored?.value).toMatch(/^v1:/);
    const service = await getDeployableService(db, serviceId);
    expect(service?.environmentVariables.at(0)?.value).toBe("rotated");
  });

  it.each([
    { reason: "renamed", key: "RENAMED", isSecret: true },
    { reason: "turned into plain variables", key: "TOKEN", isSecret: false },
  ])("should require the values of secrets that are $reason", async ({ key, isSecret }) => {
    expect(() => updateService(db, serviceId, {
      ...base,
      name: "changed",
      environmentVariables: [{ key, value: null, scope: "runtime", isSecret }],
    })).toThrow(MissingSecretValueError);
    // Nothing is saved
    expect(await getDeployableService(db, serviceId)).toMatchObject({
      name: "app",
      ports: [{ external: 8080, internal: 80 }],
      environmentVariables: [{ key: "TOKEN", value: "hunter2" }],
    });
  });
});
