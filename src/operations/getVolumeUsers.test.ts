import { DatabaseSync } from "node:sqlite";
import { drizzle } from "drizzle-orm/node-sqlite";
import { migrate } from "drizzle-orm/node-sqlite/migrator";
import { beforeEach, describe, expect, it } from "vitest";
import { relations } from "~/database/relations";
import { services } from "~/database/schema/services";
import createService from "./createService";
import getVolumeUsers from "./getVolumeUsers";

const client = new DatabaseSync(":memory:");
const db = drizzle({ client, relations });
migrate(db, { migrationsFolder: "drizzle" });

function create(name: string, volumeNames: string[]) {
  return createService(db, {
    name,
    type: "dockerhub",
    repository: "postgres",
    branch: "17",
    internetAccess: true,
    environmentVariables: [],
    volumes: volumeNames.map((volumeName, index) => ({ name: volumeName, containerPath: `/${index}` })),
  }).id;
}

beforeEach(async () => {
  await db.delete(services);
});

describe("getVolumeUsers", () => {
  it("returns the services of each volume, once", async () => {
    create("db", ["data", "data", "cache"]);
    create("worker", ["cache"]);
    await expect(getVolumeUsers(db)).resolves.toEqual({ data: ["db"], cache: ["db", "worker"] });
  });

  it("leaves out the given service", async () => {
    const id = create("db", ["data", "cache"]);
    create("worker", ["cache"]);
    await expect(getVolumeUsers(db, id)).resolves.toEqual({ cache: ["worker"] });
  });
});
