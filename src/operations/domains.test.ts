import { DatabaseSync } from "node:sqlite";
import { drizzle } from "drizzle-orm/node-sqlite";
import { migrate } from "drizzle-orm/node-sqlite/migrator";
import { beforeEach, describe, expect, it } from "vitest";
import { relations } from "~/database/relations";
import { services } from "~/database/schema/services";
import { settings } from "~/database/schema/settings";
import createDomain from "./createDomain";
import createService from "./createService";
import deleteDashboardDomain from "./deleteDashboardDomain";
import deleteDomain from "./deleteDomain";
import deleteService from "./deleteService";
import getDashboardDomain from "./getDashboardDomain";
import getDomains from "./getDomains";
import getService from "./getService";
import getServicesWithDomains from "./getServicesWithDomains";
import setDashboardDomain from "./setDashboardDomain";

const client = new DatabaseSync(":memory:");
const db = drizzle({ client, relations });
migrate(db, { migrationsFolder: "drizzle" });

function create(name: string) {
  return createService(db, { name, type: "dockerhub", repository: "nginx", branch: "alpine", internetAccess: true }).id;
}

async function getServiceDomains(serviceId: string) {
  const service = await getService(db, serviceId);
  return service?.domains.map(({ hostname, port }) => ({ hostname, port }));
}

beforeEach(async () => {
  await db.delete(services);
  await db.delete(settings);
});

describe("domain operations", () => {
  it("should add domains and list them with the service", async () => {
    const id = create("app");
    expect(createDomain(db, { hostname: "www.example.com", serviceId: id, port: 80 })).toBe(true);
    expect(createDomain(db, { hostname: "app.example.com", serviceId: id, port: 3000 })).toBe(true);
    expect(await getServiceDomains(id)).toEqual([
      { hostname: "app.example.com", port: 3000 },
      { hostname: "www.example.com", port: 80 },
    ]);
  });

  it("should list each service with domains once", async () => {
    const id = create("app");
    create("other");
    expect(await getServicesWithDomains(db)).toEqual([]);
    createDomain(db, { hostname: "www.example.com", serviceId: id, port: 80 });
    createDomain(db, { hostname: "app.example.com", serviceId: id, port: 80 });
    expect(await getServicesWithDomains(db)).toEqual([id]);
  });

  it("should list the domains of all services", async () => {
    const id = create("app");
    const otherId = create("other");
    createDomain(db, { hostname: "www.example.com", serviceId: id, port: 80 });
    createDomain(db, { hostname: "app.example.com", serviceId: otherId, port: 3000 });
    expect(await getDomains(db)).toEqual([
      expect.objectContaining({ hostname: "app.example.com", serviceId: otherId, port: 3000 }),
      expect.objectContaining({ hostname: "www.example.com", serviceId: id, port: 80 }),
    ]);
  });

  it("should not add a hostname that is already taken", async () => {
    const id = create("app");
    const otherId = create("other");
    createDomain(db, { hostname: "app.example.com", serviceId: id, port: 80 });
    expect(createDomain(db, { hostname: "app.example.com", serviceId: otherId, port: 3000 })).toBe(false);
    expect(createDomain(db, { hostname: "app.example.com", serviceId: id, port: 3000 })).toBe(false);
    expect(await getServiceDomains(id)).toEqual([{ hostname: "app.example.com", port: 80 }]);
    expect(await getServiceDomains(otherId)).toEqual([]);
  });

  it("should only remove the domains of the given service", async () => {
    const id = create("app");
    const otherId = create("other");
    createDomain(db, { hostname: "app.example.com", serviceId: id, port: 80 });
    expect(await deleteDomain(db, otherId, "app.example.com")).toBeUndefined();
    expect(await deleteDomain(db, id, "app.example.com")).toMatchObject({ serviceId: id, port: 80 });
    expect(await deleteDomain(db, id, "app.example.com")).toBeUndefined();
    expect(await getServiceDomains(id)).toEqual([]);
  });

  it("should free the hostname when the service is deleted", async () => {
    const id = create("app");
    createDomain(db, { hostname: "app.example.com", serviceId: id, port: 80 });
    await deleteService(db, id);
    expect(createDomain(db, { hostname: "app.example.com", serviceId: create("other"), port: 80 })).toBe(true);
  });
});

describe("dashboard domain operations", () => {
  it("should set, change and remove the domain", async () => {
    expect(await getDashboardDomain(db)).toBeNull();
    expect(setDashboardDomain(db, "buttler.example.com")).toBe(true);
    expect(await getDashboardDomain(db)).toBe("buttler.example.com");
    expect(setDashboardDomain(db, "panel.example.com")).toBe(true);
    expect(await getDashboardDomain(db)).toBe("panel.example.com");
    expect(await deleteDashboardDomain(db)).toBe("panel.example.com");
    expect(await getDashboardDomain(db)).toBeNull();
    expect(await deleteDashboardDomain(db)).toBeUndefined();
  });

  it("should keep the other settings", async () => {
    await db.insert(settings).values({ key: "installed", value: "true" });
    setDashboardDomain(db, "buttler.example.com");
    await deleteDashboardDomain(db);
    expect(await db.query.settings.findMany()).toMatchObject([{ key: "installed", value: "true" }]);
  });

  it("should not use the hostname of a service", async () => {
    const id = create("app");
    createDomain(db, { hostname: "app.example.com", serviceId: id, port: 80 });
    setDashboardDomain(db, "buttler.example.com");
    expect(setDashboardDomain(db, "app.example.com")).toBe(false);
    expect(await getDashboardDomain(db)).toBe("buttler.example.com");
  });

  it("should not let a service use the hostname of the dashboard", async () => {
    const id = create("app");
    setDashboardDomain(db, "buttler.example.com");
    expect(createDomain(db, { hostname: "buttler.example.com", serviceId: id, port: 80 })).toBe(false);
    expect(await getServiceDomains(id)).toEqual([]);
    await deleteDashboardDomain(db);
    expect(createDomain(db, { hostname: "buttler.example.com", serviceId: id, port: 80 })).toBe(true);
  });

  it("should only reserve the hostname of the dashboard, not the values of other settings", async () => {
    await db.insert(settings).values({ key: "other", value: "app.example.com" });
    expect(createDomain(db, { hostname: "app.example.com", serviceId: create("app"), port: 80 })).toBe(true);
  });
});
