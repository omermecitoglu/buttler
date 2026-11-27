import { DatabaseSync } from "node:sqlite";
import { drizzle } from "drizzle-orm/node-sqlite";
import { migrate } from "drizzle-orm/node-sqlite/migrator";
import { beforeEach, describe, expect, it } from "vitest";
import { relations } from "~/database/relations";
import { services } from "~/database/schema/services";
import createDomain from "./createDomain";
import createService from "./createService";
import createServiceLink from "./createServiceLink";
import deleteDomain from "./deleteDomain";
import ensureReverseProxyService from "./ensureReverseProxyService";
import getServiceLinks, { getLinkedServiceId } from "./getServiceLinks";
import syncReverseProxyLinks from "./syncReverseProxyLinks";

const client = new DatabaseSync(":memory:");
const db = drizzle({ client, relations });
migrate(db, { migrationsFolder: "drizzle" });

function create(name: string) {
  return createService(db, { name, type: "dockerhub", repository: "nginx", branch: "alpine", internetAccess: true }).id;
}

async function getLinkedServices(serviceId: string) {
  return (await getServiceLinks(db, serviceId)).map(link => getLinkedServiceId(link, serviceId)).sort();
}

beforeEach(async () => {
  await db.delete(services);
});

describe("syncReverseProxyLinks", () => {
  it("should do nothing without nginx", async () => {
    const app = create("app");
    createDomain(db, { hostname: "app.example.com", serviceId: app, port: 80 });
    expect(syncReverseProxyLinks(db)).toEqual([]);
    expect(await getServiceLinks(db)).toEqual([]);
  });

  it("should link nginx with the first domain and unlink it with the last one", async () => {
    const { id: nginx } = await ensureReverseProxyService(db);
    const app = create("app");
    createDomain(db, { hostname: "app.example.com", serviceId: app, port: 80 });
    createDomain(db, { hostname: "www.example.com", serviceId: app, port: 80 });
    const [linkId] = syncReverseProxyLinks(db, app);
    expect(await getServiceLinks(db, app)).toEqual([expect.objectContaining({ id: linkId })]);
    expect(await getLinkedServices(app)).toEqual([nginx]);

    await deleteDomain(db, app, "app.example.com");
    expect(syncReverseProxyLinks(db, app)).toEqual([linkId]);
    expect(await getLinkedServices(app)).toEqual([nginx]);

    await deleteDomain(db, app, "www.example.com");
    expect(syncReverseProxyLinks(db, app)).toEqual([linkId]);
    expect(await getServiceLinks(db)).toEqual([]);
    expect(syncReverseProxyLinks(db, app)).toEqual([]);
  });

  it("should only change the given service", async () => {
    const { id: nginx } = await ensureReverseProxyService(db);
    const app = create("app");
    const api = create("api");
    createDomain(db, { hostname: "app.example.com", serviceId: app, port: 80 });
    createDomain(db, { hostname: "api.example.com", serviceId: api, port: 80 });
    expect(syncReverseProxyLinks(db, app)).toHaveLength(1);
    expect(await getLinkedServices(nginx)).toEqual([app]);
  });

  it("should sync all services without one", async () => {
    const { id: nginx } = await ensureReverseProxyService(db);
    const app = create("app");
    const api = create("api");
    const other = create("other");
    createDomain(db, { hostname: "app.example.com", serviceId: app, port: 80 });
    createDomain(db, { hostname: "api.example.com", serviceId: api, port: 80 });
    // A link that is left from a removed domain
    await createServiceLink(db, nginx, other);
    expect(syncReverseProxyLinks(db)).toHaveLength(3);
    expect(await getLinkedServices(nginx)).toEqual([api, app].sort());
  });

  it("should keep the links between other services", async () => {
    await ensureReverseProxyService(db);
    const app = create("app");
    const api = create("api");
    const link = await createServiceLink(db, app, api);
    expect(syncReverseProxyLinks(db)).toEqual([]);
    expect(await getServiceLinks(db)).toEqual([link]);
  });
});
