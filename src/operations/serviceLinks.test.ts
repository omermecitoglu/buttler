import { DatabaseSync } from "node:sqlite";
import { drizzle } from "drizzle-orm/node-sqlite";
import { migrate } from "drizzle-orm/node-sqlite/migrator";
import { beforeEach, describe, expect, it } from "vitest";
import { relations } from "~/database/relations";
import { services } from "~/database/schema/services";
import createService from "./createService";
import createServiceLink from "./createServiceLink";
import deleteService from "./deleteService";
import deleteServiceLink from "./deleteServiceLink";
import getServiceLinks, { getLinkedServiceId } from "./getServiceLinks";

const client = new DatabaseSync(":memory:");
const db = drizzle({ client, relations });
migrate(db, { migrationsFolder: "drizzle" });

function create(name: string) {
  return createService(db, { name, type: "dockerhub", repository: "nginx", branch: "alpine", internetAccess: true }).id;
}

beforeEach(async () => {
  await db.delete(services);
});

describe("service link operations", () => {
  it("should link two services once, in either direction", async () => {
    const app = create("app");
    const api = create("api");
    const link = await createServiceLink(db, app, api);
    expect(link).toBeDefined();
    expect(await createServiceLink(db, api, app)).toBeUndefined();
    expect(await createServiceLink(db, app, api)).toBeUndefined();
    expect(await getServiceLinks(db, app)).toEqual([link]);
    expect(await getServiceLinks(db, api)).toEqual([link]);
  });

  it("should not link a service to itself", async () => {
    const app = create("app");
    expect(await createServiceLink(db, app, app)).toBeUndefined();
    expect(await getServiceLinks(db)).toEqual([]);
  });

  it("should return the service on the other side", async () => {
    const app = create("app");
    const api = create("api");
    const link = await createServiceLink(db, app, api);
    expect(getLinkedServiceId(link!, app)).toBe(api);
    expect(getLinkedServiceId(link!, api)).toBe(app);
  });

  it("should only remove a link through one of its services", async () => {
    const app = create("app");
    const api = create("api");
    const other = create("other");
    const link = await createServiceLink(db, app, api);
    expect(await deleteServiceLink(db, other, link!.id)).toBeUndefined();
    expect(await deleteServiceLink(db, api, link!.id)).toEqual(link);
    expect(await getServiceLinks(db)).toEqual([]);
  });

  it("should delete the links with a service", async () => {
    const app = create("app");
    const api = create("api");
    const db2 = create("db");
    await createServiceLink(db, app, api);
    const kept = await createServiceLink(db, api, db2);
    await deleteService(db, app);
    expect(await getServiceLinks(db)).toEqual([kept]);
  });
});
