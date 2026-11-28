import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { drizzle } from "drizzle-orm/node-sqlite";
import { migrate } from "drizzle-orm/node-sqlite/migrator";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { relations } from "~/database/relations";
import { services } from "~/database/schema/services";
import createService from "./createService";
import createServiceLink from "./createServiceLink";
import deleteServiceLink from "./deleteServiceLink";
import getInheritedVariables from "./getInheritedVariables";
import getSharedVariables from "./getSharedVariables";
import saveSharedVariables from "./saveSharedVariables";
import updateLinkInheritance, { updateLinksInheritance } from "./updateLinkInheritance";

const client = new DatabaseSync(":memory:");
const db = drizzle({ client, relations });
migrate(db, { migrationsFolder: "drizzle" });

function create(name: string, environmentVariables: Parameters<typeof createService>[1]["environmentVariables"] = []) {
  return createService(db, {
    name,
    type: "dockerhub",
    repository: "postgres",
    branch: "latest",
    internetAccess: true,
    environmentVariables,
  }).id;
}

async function link(serviceId: string, otherServiceId: string) {
  const created = await createServiceLink(db, serviceId, otherServiceId);
  if (!created) throw new Error("Not linked");
  return created;
}

let home: string;

beforeEach(async () => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), "buttler-shared-"));
  vi.stubEnv("BUTTLER_HOME", home);
  await db.delete(services);
});

afterEach(() => {
  vi.unstubAllEnvs();
  fs.rmSync(home, { recursive: true, force: true });
});

describe("shared variables", () => {
  it("should be created with the service", async () => {
    const serviceId = createService(db, {
      name: "db",
      type: "dockerhub",
      repository: "redis",
      branch: "latest",
      internetAccess: true,
      sharedVariables: [{ key: "REDIS_URL", template: "redis://{host}:6379" }],
    }).id;
    const saved = await getSharedVariables(db, serviceId);
    expect(saved.map(({ key, template }) => [key, template])).toEqual([["REDIS_URL", "redis://{host}:6379"]]);
  });

  it("should keep the IDs of updated variables, even when keys are swapped", async () => {
    const db1 = create("db");
    const [a, b] = saveSharedVariables(db, db1, [
      { key: "A", template: "a" },
      { key: "B", template: "b" },
    ]).sort((x, y) => x.key.localeCompare(y.key));
    saveSharedVariables(db, db1, [
      { id: a.id, key: "B", template: "a" },
      { id: b.id, key: "A", template: "b" },
      { key: "C", template: "c" },
    ]);
    const saved = await getSharedVariables(db, db1);
    expect(saved.map(({ id, key, template }) => [id === a.id, id === b.id, key, template])).toEqual([
      [false, true, "A", "b"],
      [true, false, "B", "a"],
      [false, false, "C", "c"],
    ]);
    saveSharedVariables(db, db1, []);
    expect(await getSharedVariables(db, db1)).toEqual([]);
  });

  it("should not touch the variables of other services", async () => {
    const db1 = create("db1");
    const db2 = create("db2");
    const [variable] = saveSharedVariables(db, db1, [{ key: "A", template: "a" }]);
    saveSharedVariables(db, db2, [{ id: variable.id, key: "B", template: "b" }]);
    expect(await getSharedVariables(db, db1)).toEqual([variable]);
  });
});

describe("inherited variables", () => {
  it("should only be inherited by the sides that opt in", async () => {
    const pg = create("db", [{ key: "POSTGRES_USER", value: "admin", scope: "runtime", isSecret: false }]);
    const app = create("app");
    const serviceLink = await link(pg, app);
    saveSharedVariables(db, pg, [
      { key: "POSTGRES_HOST", template: "{host}" },
      { key: "POSTGRES_USER", template: "{env.POSTGRES_USER}" },
    ]);
    expect(await getInheritedVariables(db, app)).toEqual([]);

    updateLinkInheritance(db, app, serviceLink.id, { inherits: true, names: [] });
    expect((await getInheritedVariables(db, app)).map(({ name, value }) => [name, value])).toEqual([
      ["POSTGRES_HOST", `buttler-service-${pg}`],
      ["POSTGRES_USER", "admin"],
    ]);
    expect(await getInheritedVariables(db, pg)).toEqual([]);
  });

  it("should use the names of the inheriting service", async () => {
    const pg = create("db");
    const app = create("app");
    const serviceLink = await link(pg, app);
    const [host] = saveSharedVariables(db, pg, [{ key: "POSTGRES_HOST", template: "{host}" }]);
    updateLinkInheritance(db, app, serviceLink.id, {
      inherits: true,
      names: [{ sharedVariableId: host.id, name: "DB_HOST" }],
    });
    expect((await getInheritedVariables(db, app)).map(({ key, name }) => [key, name])).toEqual([
      ["POSTGRES_HOST", "DB_HOST"],
    ]);

    // The names are kept while the key changes
    saveSharedVariables(db, pg, [{ id: host.id, key: "PGHOST", template: "{host}" }]);
    expect((await getInheritedVariables(db, app)).map(({ key, name }) => [key, name])).toEqual([["PGHOST", "DB_HOST"]]);

    updateLinkInheritance(db, app, serviceLink.id, { inherits: true, names: [] });
    expect((await getInheritedVariables(db, app)).map(({ name }) => name)).toEqual(["PGHOST"]);
  });

  it("should change several links at once, or none of them", async () => {
    const pg = create("db");
    const cache = create("cache");
    const app = create("app");
    const pgLink = await link(pg, app);
    const cacheLink = await link(cache, app);
    const otherLink = await link(pg, cache);
    saveSharedVariables(db, pg, [{ key: "POSTGRES_HOST", template: "{host}" }]);
    const [redis] = saveSharedVariables(db, cache, [{ key: "REDIS_HOST", template: "{host}" }]);

    // The service isn't on the last link
    expect(updateLinksInheritance(db, app, [
      { linkId: pgLink.id, inherits: true, names: [] },
      { linkId: otherLink.id, inherits: true, names: [] },
    ])).toBeUndefined();
    expect(await getInheritedVariables(db, app)).toEqual([]);

    expect(updateLinksInheritance(db, app, [
      { linkId: pgLink.id, inherits: true, names: [] },
      { linkId: cacheLink.id, inherits: true, names: [{ sharedVariableId: redis.id, name: "CACHE_HOST" }] },
    ])).toHaveLength(2);
    expect((await getInheritedVariables(db, app)).map(({ name }) => name).toSorted()).toEqual([
      "CACHE_HOST",
      "POSTGRES_HOST",
    ]);
  });

  it("should not store a name that is the same as the key", async () => {
    const pg = create("db");
    const app = create("app");
    const serviceLink = await link(pg, app);
    const [host] = saveSharedVariables(db, pg, [{ key: "HOST", template: "{host}" }]);
    updateLinkInheritance(db, app, serviceLink.id, { inherits: true, names: [{ sharedVariableId: host.id, name: "HOST" }] });
    expect(client.prepare("SELECT * FROM shared_variable_names").all()).toEqual([]);
  });

  it("should not rename the variables of the inheriting service itself", async () => {
    const pg = create("db");
    const app = create("app");
    const serviceLink = await link(pg, app);
    const [own] = saveSharedVariables(db, app, [{ key: "APP_URL", template: "{host}" }]);
    updateLinkInheritance(db, app, serviceLink.id, { inherits: true, names: [{ sharedVariableId: own.id, name: "X" }] });
    updateLinkInheritance(db, pg, serviceLink.id, { inherits: true, names: [] });
    expect((await getInheritedVariables(db, pg)).map(({ name }) => name)).toEqual(["APP_URL"]);
  });

  it("should only be changed through a service of the link", async () => {
    const pg = create("db");
    const app = create("app");
    const other = create("other");
    const serviceLink = await link(pg, app);
    expect(updateLinkInheritance(db, other, serviceLink.id, { inherits: true, names: [] })).toBeUndefined();
    expect(updateLinkInheritance(db, app, "missing", { inherits: true, names: [] })).toBeUndefined();
    expect(updateLinkInheritance(db, app, serviceLink.id, { inherits: true, names: [] })).toMatchObject({
      serviceAInherits: serviceLink.serviceAId === app,
      serviceBInherits: serviceLink.serviceBId === app,
    });
  });

  it("should keep the variable of the older link when two have the same name", async () => {
    const db1 = create("db1");
    const db2 = create("db2");
    const app = create("app");
    const link1 = await link(db1, app);
    const link2 = await link(db2, app);
    // Both are created in the same second
    client.prepare("UPDATE service_links SET created_at = '2000-01-01 00:00:00' WHERE id = ?").run(link1.id);
    saveSharedVariables(db, db1, [{ key: "HOST", template: "one" }]);
    saveSharedVariables(db, db2, [{ key: "HOST", template: "two" }]);
    updateLinkInheritance(db, app, link1.id, { inherits: true, names: [] });
    updateLinkInheritance(db, app, link2.id, { inherits: true, names: [] });
    expect((await getInheritedVariables(db, app)).map(({ value }) => value)).toEqual(["one"]);
  });

  it("should hide the values that are built from secrets, unless they are decrypted", async () => {
    const pg = create("db", [{ key: "POSTGRES_PASSWORD", value: "hunter2", scope: "runtime", isSecret: true }]);
    const app = create("app");
    const serviceLink = await link(pg, app);
    saveSharedVariables(db, pg, [{ key: "URL", template: "postgres://admin:{env.POSTGRES_PASSWORD}@{host}" }]);
    updateLinkInheritance(db, app, serviceLink.id, { inherits: true, names: [] });
    expect(await getInheritedVariables(db, app)).toMatchObject([{ value: null, isSecret: true }]);
    expect(await getInheritedVariables(db, app, { decrypt: true })).toMatchObject([
      { value: `postgres://admin:hunter2@buttler-service-${pg}`, isSecret: true },
    ]);
  });

  it("should report the variables that aren't set", async () => {
    const pg = create("db");
    const app = create("app");
    const serviceLink = await link(pg, app);
    saveSharedVariables(db, pg, [{ key: "USER", template: "{env.POSTGRES_USER}" }]);
    updateLinkInheritance(db, app, serviceLink.id, { inherits: true, names: [] });
    expect(await getInheritedVariables(db, app)).toMatchObject([{ value: "", unset: ["POSTGRES_USER"] }]);
  });

  it("should be gone with the link", async () => {
    const pg = create("db");
    const app = create("app");
    const serviceLink = await link(pg, app);
    saveSharedVariables(db, pg, [{ key: "HOST", template: "{host}" }]);
    updateLinkInheritance(db, app, serviceLink.id, { inherits: true, names: [] });
    await deleteServiceLink(db, app, serviceLink.id);
    expect(await getInheritedVariables(db, app)).toEqual([]);
  });
});
