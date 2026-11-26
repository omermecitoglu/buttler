import { DatabaseSync } from "node:sqlite";
import { drizzle } from "drizzle-orm/node-sqlite";
import { migrate } from "drizzle-orm/node-sqlite/migrator";
import { describe, expect, it } from "vitest";
import { relations } from "~/database/relations";
import createService from "./createService";
import getServicesByBranch from "./getServicesByBranch";

describe("getServicesByBranch", () => {
  const db = drizzle({ client: new DatabaseSync(":memory:"), relations });
  migrate(db, { migrationsFolder: "drizzle" });

  createService(db, { name: "main", type: "github", repository: "acme/app", branch: "main", internetAccess: true });
  createService(db, { name: "main by url", type: "github", repository: "https://github.com/Acme/App.git", branch: "main", internetAccess: true });
  createService(db, { name: "dev", type: "github", repository: "acme/app", branch: "dev", internetAccess: true });
  createService(db, { name: "another repository", type: "github", repository: "acme/app2", branch: "main", internetAccess: true });
  createService(db, { name: "invalid repository", type: "github", repository: "invalid", branch: "main", internetAccess: true });
  createService(db, { name: "no repository", type: "github", repository: null, branch: "main", internetAccess: true });
  createService(db, { name: "image", type: "dockerhub", repository: "acme/app", branch: "main", internetAccess: true });

  async function getNames(repository: string, branch: string) {
    const services = await getServicesByBranch(db, repository, branch);
    return services.map(service => service.name).sort();
  }

  it("should match the repository and the branch", async () => {
    expect(await getNames("acme/app", "main")).toEqual(["main", "main by url"]);
    expect(await getNames("ACME/app", "dev")).toEqual(["dev"]);
  });

  it("should not match anything else", async () => {
    expect(await getNames("acme/app", "Main")).toEqual([]);
    expect(await getNames("acme/unknown", "main")).toEqual([]);
    expect(await getNames("invalid", "main")).toEqual([]);
  });
});
