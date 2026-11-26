import { DatabaseSync } from "node:sqlite";
import { drizzle } from "drizzle-orm/node-sqlite";
import { migrate } from "drizzle-orm/node-sqlite/migrator";
import { beforeEach, describe, expect, it } from "vitest";
import { relations } from "~/database/relations";
import { services } from "~/database/schema/services";
import createService from "./createService";
import deleteService from "./deleteService";
import getService from "./getService";
import getSharedVolumes from "./getSharedVolumes";

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
    environmentVariables: [{ key: "URL", value: "http://localhost", scope: "runtime", isSecret: false }],
    volumes: volumeNames.map(volumeName => ({ name: volumeName, containerPath: `/${volumeName}` })),
  }).id;
}

beforeEach(async () => {
  await db.delete(services);
});

describe("deleteService", () => {
  it("should delete the service with everything that belongs to it", async () => {
    const id = create("app", ["data"]);
    const otherId = create("other", ["data"]);
    expect(await deleteService(db, id)).toMatchObject({ id, name: "app" });
    expect(await getService(db, id)).toBeNull();
    expect(await db.query.volumes.findMany()).toMatchObject([{ serviceId: otherId }]);
    expect(await db.query.environmentVariables.findMany()).toMatchObject([{ serviceId: otherId }]);
  });

  it("should return nothing if there is no such service", async () => {
    expect(await deleteService(db, "unknown")).toBeUndefined();
  });
});

describe("getSharedVolumes", () => {
  it("should only return the volumes that other services use too", async () => {
    const id = create("app", ["data", "cache"]);
    create("other", ["data", "logs"]);
    expect(await getSharedVolumes(db, id)).toEqual(["data"]);
  });

  it("should not count the mounts of the same service as shared", async () => {
    expect(await getSharedVolumes(db, create("app", ["data", "cache"]))).toEqual([]);
  });
});
