import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { drizzle } from "drizzle-orm/node-sqlite";
import { migrate } from "drizzle-orm/node-sqlite/migrator";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ServiceRecipeSchema } from "~/core/service-recipe";
import { relations } from "~/database/relations";
import { services } from "~/database/schema/services";
import createDomain from "./createDomain";
import createService, { type CreateServiceOptions } from "./createService";
import createServiceLink from "./createServiceLink";
import getServiceRecipe from "./getServiceRecipe";
import getSharedVariables from "./getSharedVariables";
import updateLinkInheritance from "./updateLinkInheritance";
import updateService from "./updateService";

const client = new DatabaseSync(":memory:");
const db = drizzle({ client, relations });
migrate(db, { migrationsFolder: "drizzle" });

function create(name: string, options: Partial<CreateServiceOptions> = {}) {
  return createService(db, {
    name,
    type: "dockerhub",
    repository: "postgres",
    branch: "latest",
    internetAccess: false,
    ...options,
  }).id;
}

async function link(serviceId: string, otherServiceId: string) {
  const created = await createServiceLink(db, serviceId, otherServiceId);
  if (!created) throw new Error("Not linked");
  return created;
}

let home: string;

beforeEach(async () => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), "buttler-recipe-"));
  vi.stubEnv("BUTTLER_HOME", home);
  await db.delete(services);
});

afterEach(() => {
  vi.unstubAllEnvs();
  fs.rmSync(home, { recursive: true, force: true });
});

describe("getServiceRecipe", () => {
  it("should describe the settings of a service", async () => {
    const id = create("db", {
      ports: [{ external: 5432, internal: 5432 }],
      volumes: [{ name: "pgdata", containerPath: "/var/lib/postgresql/data" }],
      environmentVariables: [{ key: "POSTGRES_USER", value: "admin", scope: "runtime", isSecret: false }],
      sharedVariables: [{ key: "DB_HOST", template: "{host}" }],
    });
    createDomain(db, { hostname: "db.example.com", serviceId: id, port: 5432 });
    updateService(db, id, { devices: ["usb-printer"] });

    const recipe = await getServiceRecipe(db, [id]);

    expect(ServiceRecipeSchema.parse(recipe)).toEqual(recipe);
    expect(recipe).toEqual({
      version: 1,
      services: [{
        id,
        name: "db",
        type: "dockerhub",
        repository: "postgres",
        branch: "latest",
        internetAccess: false,
        devices: ["usb-printer"],
        ports: [{ external: 5432, internal: 5432 }],
        volumes: [{ name: "pgdata", containerPath: "/var/lib/postgresql/data" }],
        environmentVariables: [{ key: "POSTGRES_USER", value: "admin", scope: "runtime", isSecret: false }],
        domains: [{ hostname: "db.example.com", port: 5432 }],
        sharedVariables: [{ key: "DB_HOST", template: "{host}" }],
      }],
      links: [],
    });
  });

  it("should leave the values of secrets out", async () => {
    const id = create("db", {
      environmentVariables: [{ key: "POSTGRES_PASSWORD", value: "hunter2", scope: "both", isSecret: true }],
    });

    const recipe = await getServiceRecipe(db, [id]);

    expect(recipe.services[0].environmentVariables).toEqual([
      { key: "POSTGRES_PASSWORD", value: null, scope: "both", isSecret: true },
    ]);
  });

  it("should only describe the chosen services", async () => {
    const db1 = create("db");
    create("cache");

    const recipe = await getServiceRecipe(db, [db1]);

    expect(recipe.services.map(service => service.name)).toEqual(["db"]);
  });

  it("should leave system services out", async () => {
    const id = create("nginx", { type: "system" });

    const recipe = await getServiceRecipe(db, [id]);

    expect(recipe.services).toEqual([]);
  });

  it("should keep the links between the chosen services with their names", async () => {
    const dbId = create("db", { sharedVariables: [{ key: "DB_HOST", template: "{host}" }] });
    const apiId = create("api");
    const created = await link(dbId, apiId);
    const [shared] = await getSharedVariables(db, dbId);
    updateLinkInheritance(db, apiId, created.id, {
      inherits: true,
      names: [{ sharedVariableId: shared.id, name: "PGHOST" }],
    });

    const recipe = await getServiceRecipe(db, [dbId, apiId]);

    const apiInherits = created.serviceAId === apiId ? [true, false] : [false, true];
    expect(recipe.links).toEqual([{
      services: [created.serviceAId, created.serviceBId],
      inherits: apiInherits,
      names: [{ service: dbId, key: "DB_HOST", name: "PGHOST" }],
    }]);
  });

  it("should leave out the links to services that aren't chosen", async () => {
    const dbId = create("db", { sharedVariables: [{ key: "DB_HOST", template: "{host}" }] });
    const apiId = create("api");
    await link(dbId, apiId);

    const recipe = await getServiceRecipe(db, [dbId]);

    expect(recipe.links).toEqual([]);
    expect(recipe.services[0].sharedVariables).toEqual([{ key: "DB_HOST", template: "{host}" }]);
  });
});
