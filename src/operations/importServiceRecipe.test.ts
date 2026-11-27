import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { drizzle } from "drizzle-orm/node-sqlite";
import { migrate } from "drizzle-orm/node-sqlite/migrator";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type ServiceRecipe, ServiceRecipeSchema } from "~/core/service-recipe";
import { relations } from "~/database/relations";
import { services } from "~/database/schema/services";
import createDomain from "./createDomain";
import createService, { type CreateServiceOptions } from "./createService";
import createServiceLink from "./createServiceLink";
import getDeployableService from "./getDeployableService";
import getServiceRecipe from "./getServiceRecipe";
import getServices from "./getServices";
import getSharedVariables from "./getSharedVariables";
import importServiceRecipe from "./importServiceRecipe";
import setDashboardDomain from "./setDashboardDomain";
import updateLinkInheritance from "./updateLinkInheritance";

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

function recipeOf(...recipeServices: Partial<ServiceRecipe["services"][number]>[]): ServiceRecipe {
  return {
    version: 1,
    services: recipeServices.map((service, index) => ({
      id: `service-${index}`,
      name: `service-${index}`,
      type: "dockerhub",
      repository: "redis",
      branch: "latest",
      internetAccess: true,
      ports: [],
      volumes: [],
      environmentVariables: [],
      domains: [],
      sharedVariables: [],
      ...service,
    })),
    links: [],
  };
}

/** Exports everything, and empties the database as if it was another Buttler */
async function moveEverything() {
  const all = await getServices(db);
  const recipe = await getServiceRecipe(db, all.map(({ id }) => id));
  await db.delete(services);
  return recipe;
}

let home: string;

beforeEach(async () => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), "buttler-import-"));
  vi.stubEnv("BUTTLER_HOME", home);
  await db.delete(services);
});

afterEach(() => {
  vi.unstubAllEnvs();
  fs.rmSync(home, { recursive: true, force: true });
});

describe("importServiceRecipe", () => {
  it("should create the same services as they were exported", async () => {
    const dbId = create("db", {
      ports: [{ external: 5432, internal: 5432 }],
      volumes: [{ name: "pgdata", containerPath: "/var/lib/postgresql/data" }],
      environmentVariables: [{ key: "POSTGRES_USER", value: "admin", scope: "runtime", isSecret: false }],
      sharedVariables: [{ key: "DB_HOST", template: "{host}" }],
    });
    const apiId = create("api");
    createDomain(db, { hostname: "api.example.com", serviceId: apiId, port: 3000 });
    const link = await createServiceLink(db, dbId, apiId);
    const [shared] = await getSharedVariables(db, dbId);
    updateLinkInheritance(db, apiId, link!.id, { inherits: true, names: [{ sharedVariableId: shared.id, name: "PGHOST" }] });
    const recipe = await moveEverything();

    const result = await importServiceRecipe(db, recipe);

    expect(result).toEqual({ services: expect.arrayContaining([
      { id: expect.any(String), name: "db", hasSecrets: false },
      { id: expect.any(String), name: "api", hasSecrets: false },
    ]) });
    // Only the IDs are new, so the export of the import is the same file
    const imported = await getServiceRecipe(db, (await getServices(db)).map(({ id }) => id));
    const ids = new Map(imported.services.map(service => [
      service.id,
      recipe.services.find(({ name }) => name === service.name)!.id,
    ]));
    const renamed: ServiceRecipe = JSON.parse(JSON.stringify(imported), (_key, value) => ids.get(value) ?? value);
    expect(normalize(renamed)).toEqual(normalize(recipe));
  });

  it("should create secrets with empty values and report them", async () => {
    const result = await importServiceRecipe(db, recipeOf({
      environmentVariables: [{ key: "PASSWORD", value: null, scope: "runtime", isSecret: true }],
    }));

    if (!("services" in result)) throw new Error("Not imported");
    expect(result.services[0].hasSecrets).toBe(true);
    const deployable = await getDeployableService(db, result.services[0].id);
    expect(deployable?.environmentVariables).toEqual([
      expect.objectContaining({ key: "PASSWORD", value: "", isSecret: true }),
    ]);
  });

  it("should report the services that inherit a secret", async () => {
    const recipe = recipeOf(
      {
        environmentVariables: [{ key: "PASSWORD", value: null, scope: "runtime", isSecret: true }],
        sharedVariables: [{ key: "DATABASE_URL", template: "postgres://user:{env.PASSWORD}@{host}" }],
      },
      {},
      {},
    );
    recipe.links = [
      { services: ["service-0", "service-1"], inherits: [false, true], names: [] },
      { services: ["service-0", "service-2"], inherits: [false, false], names: [] },
    ];

    const result = await importServiceRecipe(db, recipe);

    if (!("services" in result)) throw new Error("Not imported");
    expect(result.services.map(({ hasSecrets }) => hasSecrets)).toEqual([true, true, false]);
  });

  it("should create nothing when a name, a domain or a port is taken", async () => {
    const webId = create("web", { ports: [{ external: 8080, internal: 80 }] });
    createDomain(db, { hostname: "taken.example.com", serviceId: webId, port: 80 });
    await setDashboardDomain(db, "dashboard.example.com");

    const result = await importServiceRecipe(db, recipeOf(
      { name: "web" },
      {
        ports: [{ external: 8080, internal: 3000 }],
        domains: [{ hostname: "taken.example.com", port: 3000 }, { hostname: "dashboard.example.com", port: 3000 }],
      },
    ));

    expect(result).toEqual({ conflicts: expect.arrayContaining([
      { type: "name", name: "web" },
      { type: "domain", hostname: "taken.example.com", owner: "web" },
      { type: "domain", hostname: "dashboard.example.com", owner: null },
      { type: "port", port: 8080, owner: "web" },
    ]) });
    expect((await getServices(db)).map(({ name }) => name)).toEqual(["web"]);
  });
});

describe("ServiceRecipeSchema", () => {
  it("should reject links to services that aren't in the file", () => {
    const recipe = recipeOf({});
    recipe.links = [{ services: ["service-0", "missing"], inherits: [false, false], names: [] }];
    expect(ServiceRecipeSchema.safeParse(recipe).success).toBe(false);
  });

  it("should reject renamed variables that aren't shared by the link", () => {
    const recipe = recipeOf({}, {});
    recipe.links = [{
      services: ["service-0", "service-1"],
      inherits: [true, false],
      names: [{ service: "service-1", key: "MISSING", name: "OTHER" }],
    }];
    expect(ServiceRecipeSchema.safeParse(recipe).success).toBe(false);
  });

  it("should reject other versions", () => {
    expect(ServiceRecipeSchema.safeParse({ ...recipeOf(), version: 2 }).success).toBe(false);
  });
});

/** Services created in the same second have no order, and the pair of a link is stored in the order of the IDs */
function normalize(recipe: ServiceRecipe) {
  return {
    ...recipe,
    services: [...recipe.services].sort((a, b) => a.name.localeCompare(b.name)),
    links: recipe.links.map(sortLink),
  };
}

function sortLink(link: ServiceRecipe["links"][number]) {
  const sides = link.services.map((service, index) => ({ service, inherits: link.inherits[index] }))
    .sort((a, b) => a.service.localeCompare(b.service));
  return { ...link, services: sides.map(({ service }) => service), inherits: sides.map(({ inherits }) => inherits) };
}
