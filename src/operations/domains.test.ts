import { DatabaseSync } from "node:sqlite";
import { drizzle } from "drizzle-orm/node-sqlite";
import { migrate } from "drizzle-orm/node-sqlite/migrator";
import { beforeEach, describe, expect, it } from "vitest";
import { relations } from "~/database/relations";
import { services } from "~/database/schema/services";
import createDomain from "./createDomain";
import createService from "./createService";
import deleteDomain from "./deleteDomain";
import deleteService from "./deleteService";
import getDomains from "./getDomains";
import getService from "./getService";
import getServicesWithDomains from "./getServicesWithDomains";

const client = new DatabaseSync(":memory:");
const db = drizzle({ client, relations });
migrate(db, { migrationsFolder: "drizzle" });

function create(name: string) {
  return createService(db, { name, type: "dockerhub", repository: "nginx", branch: "alpine" }).id;
}

async function getServiceDomains(serviceId: string) {
  const service = await getService(db, serviceId);
  return service?.domains.map(({ hostname, port }) => ({ hostname, port }));
}

beforeEach(async () => {
  await db.delete(services);
});

describe("domain operations", () => {
  it("should add domains and list them with the service", async () => {
    const id = create("app");
    expect(await createDomain(db, { hostname: "www.example.com", serviceId: id, port: 80 })).toBe(true);
    expect(await createDomain(db, { hostname: "app.example.com", serviceId: id, port: 3000 })).toBe(true);
    expect(await getServiceDomains(id)).toEqual([
      { hostname: "app.example.com", port: 3000 },
      { hostname: "www.example.com", port: 80 },
    ]);
  });

  it("should list each service with domains once", async () => {
    const id = create("app");
    create("other");
    expect(await getServicesWithDomains(db)).toEqual([]);
    await createDomain(db, { hostname: "www.example.com", serviceId: id, port: 80 });
    await createDomain(db, { hostname: "app.example.com", serviceId: id, port: 80 });
    expect(await getServicesWithDomains(db)).toEqual([id]);
  });

  it("should list the domains of all services", async () => {
    const id = create("app");
    const otherId = create("other");
    await createDomain(db, { hostname: "www.example.com", serviceId: id, port: 80 });
    await createDomain(db, { hostname: "app.example.com", serviceId: otherId, port: 3000 });
    expect(await getDomains(db)).toEqual([
      expect.objectContaining({ hostname: "app.example.com", serviceId: otherId, port: 3000 }),
      expect.objectContaining({ hostname: "www.example.com", serviceId: id, port: 80 }),
    ]);
  });

  it("should not add a hostname that is already taken", async () => {
    const id = create("app");
    const otherId = create("other");
    await createDomain(db, { hostname: "app.example.com", serviceId: id, port: 80 });
    expect(await createDomain(db, { hostname: "app.example.com", serviceId: otherId, port: 3000 })).toBe(false);
    expect(await createDomain(db, { hostname: "app.example.com", serviceId: id, port: 3000 })).toBe(false);
    expect(await getServiceDomains(id)).toEqual([{ hostname: "app.example.com", port: 80 }]);
    expect(await getServiceDomains(otherId)).toEqual([]);
  });

  it("should only remove the domains of the given service", async () => {
    const id = create("app");
    const otherId = create("other");
    await createDomain(db, { hostname: "app.example.com", serviceId: id, port: 80 });
    expect(await deleteDomain(db, otherId, "app.example.com")).toBeUndefined();
    expect(await deleteDomain(db, id, "app.example.com")).toMatchObject({ serviceId: id, port: 80 });
    expect(await deleteDomain(db, id, "app.example.com")).toBeUndefined();
    expect(await getServiceDomains(id)).toEqual([]);
  });

  it("should free the hostname when the service is deleted", async () => {
    const id = create("app");
    await createDomain(db, { hostname: "app.example.com", serviceId: id, port: 80 });
    await deleteService(db, id);
    expect(await createDomain(db, { hostname: "app.example.com", serviceId: create("other"), port: 80 })).toBe(true);
  });
});
