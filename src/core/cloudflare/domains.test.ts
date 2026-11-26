import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import db from "~/database";
import { dnsRecords } from "~/database/schema/dns-records";
import { services } from "~/database/schema/services";
import { settings } from "~/database/schema/settings";
import createDomain from "~/operations/createDomain";
import createService from "~/operations/createService";
import deleteDomain from "~/operations/deleteDomain";
import getDnsRecords from "~/operations/getDnsRecords";
import saveDnsRecord from "~/operations/saveDnsRecord";
import setDashboardDomain from "~/operations/setDashboardDomain";
import { getDomainStatuses, getDomainZones, getLeftoverHostnames, syncDomains } from "./domains";
import { CloudflareApiError, CloudflareConnectionError } from "./errors";
import { type AddressRecord, deleteAllRecords } from "./records";

const mocks = vi.hoisted(() => ({
  cloudflareFetch: vi.fn(),
  getConnectionState: vi.fn(),
  getZones: vi.fn(),
  getCloudflareTunnel: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("~/database", async () => {
  const { DatabaseSync } = await import("node:sqlite");
  const { drizzle } = await import("drizzle-orm/node-sqlite");
  const { migrate } = await import("drizzle-orm/node-sqlite/migrator");
  const { relations } = await import("~/database/relations");
  const instance = drizzle({ client: new DatabaseSync(":memory:"), relations });
  migrate(instance, { migrationsFolder: "drizzle" });
  return { default: instance };
});
vi.mock("./client", () => ({ cloudflareFetch: mocks.cloudflareFetch }));
vi.mock("./connection", () => ({ getConnectionState: mocks.getConnectionState }));
vi.mock("./zones", () => ({ getZones: mocks.getZones }));
vi.mock("~/operations/getCloudflareTunnel", () => ({ default: mocks.getCloudflareTunnel }));

const zone = { id: "z", name: "example.com", accountId: "acc", accountName: "Account" };
const tunnel = { id: "tunnel", accountId: "acc", token: "token" };

let records: AddressRecord[] = [];
let nextId = 1;

function insert(record: Omit<AddressRecord, "id">) {
  const created = { ...record, id: `r${nextId++}` };
  records.push(created);
  return created;
}

function parse(init?: RequestInit) {
  return JSON.parse((init?.body ?? "{}") as string) as Omit<AddressRecord, "id">;
}

/** Behaves like the DNS records and the tunnels of Cloudflare */
function respond(path: string, init?: RequestInit): Promise<unknown> {
  const method = init?.method ?? "GET";
  const url = new URL(path, "https://api.example");
  const id = url.pathname.split("/").at(-1);
  if (method === "PUT") return Promise.resolve({ result: {} });
  if (method === "GET") return Promise.resolve({ result: records.filter(({ name }) => name === url.searchParams.get("name.exact")) });
  if (method === "POST" && id === "batch") {
    const { deletes, posts } = JSON.parse(init?.body as string) as { deletes: { id: string }[], posts: AddressRecord[] };
    records = records.filter(record => !deletes.some(item => item.id === record.id));
    return Promise.resolve({ result: { posts: posts.map(insert) } });
  }
  if (method === "POST") return Promise.resolve({ result: insert(parse(init)) });
  if (!records.some(record => record.id === id)) return Promise.reject(new CloudflareApiError("not found", 404));
  if (method === "PATCH") {
    records = records.map(record => (record.id === id ? { ...record, ...parse(init) } : record));
  } else {
    records = records.filter(record => record.id !== id);
  }
  return Promise.resolve({ result: {} });
}

/** Lets the requests of the given kind fail */
function failWith(error: Error, isAffected: (method: string, path: string) => boolean = () => true) {
  mocks.cloudflareFetch.mockImplementation((path: string, init?: RequestInit) => (
    isAffected(init?.method ?? "GET", path) ? Promise.reject(error) : respond(path, init)
  ));
}

function getRequests() {
  return mocks.cloudflareFetch.mock.calls.map(([path, init]) => {
    const { method = "GET" } = (init ?? {}) as RequestInit;
    return `${method} ${(path as string).split("?")[0]}`;
  });
}

function getIngress() {
  const call = mocks.cloudflareFetch.mock.calls.findLast(([, init]) => (init as RequestInit | undefined)?.method === "PUT");
  const body = JSON.parse((call?.[1] as RequestInit).body as string) as { config: { ingress: unknown[] } };
  return body.config.ingress;
}

async function getStatus(hostname: string) {
  const [status] = await getDomainStatuses([hostname]);
  return status;
}

function add(hostname: string) {
  return createDomain(db, { hostname, serviceId: "srv", port: 80 });
}

const ownRecord = {
  type: "CNAME",
  name: "app.example.com",
  content: "tunnel.cfargotunnel.com",
  proxied: true,
  comment: "Managed by Buttler",
};
const foreignRecord = { type: "A", name: "app.example.com", content: "203.0.113.1", proxied: true };

describe("domains in Cloudflare", () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    await db.delete(services);
    await db.delete(settings);
    await db.delete(dnsRecords);
    records = [];
    nextId = 1;
    createService(db, { name: "app", type: "dockerhub", repository: "nginx", branch: "alpine", internetAccess: true });
    await db.update(services).set({ id: "srv" });
    mocks.cloudflareFetch.mockImplementation(respond);
    mocks.getConnectionState.mockResolvedValue("connected");
    mocks.getZones.mockResolvedValue([zone]);
    mocks.getCloudflareTunnel.mockResolvedValue(tunnel);
  });

  afterEach(async () => {
    // A pending retry would be left to the next test
    mocks.getCloudflareTunnel.mockResolvedValue(null);
    await syncDomains();
    vi.useRealTimers();
  });

  describe("adding", () => {
    it("should update the tunnel before the DNS record is created", async () => {
      add("app.example.com");
      expect(await getStatus("app.example.com")).toMatchObject({ state: "pending" });
      await syncDomains();
      expect(getRequests()).toEqual([
        "PUT /accounts/acc/cfd_tunnel/tunnel/configurations",
        "GET /zones/z/dns_records",
        "POST /zones/z/dns_records",
      ]);
      expect(records).toEqual([{ ...ownRecord, id: "r1" }]);
      expect(await getStatus("app.example.com")).toMatchObject({ state: "active" });
    });

    it("should only have exact hostnames in the tunnel", async () => {
      add("app.example.com");
      setDashboardDomain(db, "buttler.example.com");
      await syncDomains();
      expect(getIngress()).toEqual([
        { hostname: "buttler.example.com", service: "http://buttler-nginx:80" },
        { hostname: "app.example.com", service: "http://buttler-nginx:80" },
        { service: "http_status:404" },
      ]);
      expect(records.map(({ name }) => name)).toEqual(["buttler.example.com", "app.example.com"]);
    });

    it("should not look up the records that are in sync", async () => {
      add("app.example.com");
      await syncDomains();
      mocks.cloudflareFetch.mockClear();
      await syncDomains();
      expect(getRequests()).toEqual(["PUT /accounts/acc/cfd_tunnel/tunnel/configurations"]);
    });

    it("should use the most specific zone", async () => {
      mocks.getZones.mockResolvedValue([zone, { ...zone, id: "sub", name: "app.example.com" }]);
      add("www.app.example.com");
      await syncDomains();
      expect(getRequests()).toContain("POST /zones/sub/dns_records");
    });

    it("should only use the zones in the account of the tunnel", async () => {
      mocks.getZones.mockResolvedValue([{ ...zone, accountId: "other" }]);
      add("app.example.com");
      await syncDomains();
      expect(await getStatus("app.example.com")).toMatchObject({ state: "failed", failure: "no_zone" });
      expect(records).toEqual([]);
      expect(await getDomainZones()).toEqual([]);
    });

    it("should do nothing without a tunnel", async () => {
      mocks.getCloudflareTunnel.mockResolvedValue(null);
      add("app.example.com");
      await syncDomains();
      expect(mocks.cloudflareFetch).not.toHaveBeenCalled();
      expect(await getStatus("app.example.com")).toMatchObject({ state: "disconnected" });
      expect(await getDomainZones()).toBeNull();
    });
  });

  describe("removing", () => {
    beforeEach(async () => {
      add("app.example.com");
      await syncDomains();
      mocks.cloudflareFetch.mockClear();
    });

    it("should delete the DNS record before the tunnel is updated", async () => {
      await deleteDomain(db, "srv", "app.example.com");
      await syncDomains();
      expect(getRequests()).toEqual([
        "DELETE /zones/z/dns_records/r1",
        "PUT /accounts/acc/cfd_tunnel/tunnel/configurations",
      ]);
      expect(getIngress()).toEqual([{ service: "http_status:404" }]);
      expect(await getDnsRecords(db)).toEqual([]);
    });

    it("should clean up after a service that is gone", async () => {
      await db.delete(services);
      await syncDomains();
      expect(records).toEqual([]);
    });

    it("should withdraw the domains of a service that is about to be deleted", async () => {
      await syncDomains({ withoutService: "srv" });
      expect(records).toEqual([]);
      expect(getIngress()).toEqual([{ service: "http_status:404" }]);
      // The service is kept
      await syncDomains();
      expect(records).toHaveLength(1);
    });

    it("should ignore a record that is already gone", async () => {
      records = [];
      await deleteDomain(db, "srv", "app.example.com");
      await syncDomains();
      expect(await getDnsRecords(db)).toEqual([]);
    });

    it("should try again if the record can't be deleted", async () => {
      await deleteDomain(db, "srv", "app.example.com");
      failWith(new TypeError("fetch failed"));
      await syncDomains();
      expect(await getLeftoverHostnames()).toEqual(["app.example.com"]);
      mocks.cloudflareFetch.mockImplementation(respond);
      await vi.advanceTimersByTimeAsync(60_000);
      await syncDomains();
      expect(records).toEqual([]);
      expect(await getLeftoverHostnames()).toEqual([]);
    });

    it("should use the record again if the domain is added again", async () => {
      await deleteDomain(db, "srv", "app.example.com");
      failWith(new TypeError("fetch failed"));
      await syncDomains();
      mocks.cloudflareFetch.mockImplementation(respond);
      add("app.example.com");
      await syncDomains();
      expect(records).toEqual([{ ...ownRecord, id: "r1" }]);
      expect(await getStatus("app.example.com")).toMatchObject({ state: "active" });
    });
  });

  describe("ownership", () => {
    it("should ask before a hostname is taken over", async () => {
      add("app.example.com");
      const existing = insert(foreignRecord);
      await syncDomains();
      expect(await getStatus("app.example.com")).toEqual({ state: "failed", failure: "taken", details: "A 203.0.113.1" });
      expect(records).toEqual([existing]);
    });

    it("should replace the records that the user agreed to", async () => {
      add("app.example.com");
      insert({ ...foreignRecord, content: "203.0.113.2" });
      insert(foreignRecord);
      const text = insert({ ...foreignRecord, type: "TXT", content: "text" });
      await syncDomains({ takeover: { hostname: "app.example.com", records: "A 203.0.113.1, A 203.0.113.2" } });
      expect(records).toEqual([text, { ...ownRecord, id: "r4" }]);
      expect(await getStatus("app.example.com")).toMatchObject({ state: "active" });
      // It belongs to Buttler from now on
      await deleteDomain(db, "srv", "app.example.com");
      await syncDomains();
      expect(records).toEqual([text]);
    });

    it("should ask again if the records have changed", async () => {
      add("app.example.com");
      insert(foreignRecord);
      await syncDomains({ takeover: { hostname: "app.example.com", records: "A 203.0.113.9" } });
      expect(await getStatus("app.example.com")).toMatchObject({ failure: "taken", details: "A 203.0.113.1" });
      expect(records).toHaveLength(1);
    });

    it("should only take over the given hostname", async () => {
      add("app.example.com");
      insert(foreignRecord);
      await syncDomains({ takeover: { hostname: "www.example.com", records: "A 203.0.113.1" } });
      expect(records).toEqual([{ ...foreignRecord, id: "r1" }]);
    });

    it("should not touch the record of a domain that was never taken over", async () => {
      add("app.example.com");
      insert(foreignRecord);
      await syncDomains();
      await deleteDomain(db, "srv", "app.example.com");
      await syncDomains();
      expect(records).toHaveLength(1);
      expect(await getDnsRecords(db)).toEqual([]);
    });

    it("should use a record that was created but couldn't be saved", async () => {
      add("app.example.com");
      insert(ownRecord);
      await syncDomains();
      expect(records).toHaveLength(1);
      expect(await getDnsRecords(db)).toMatchObject([{ recordId: "r1", failure: null }]);
    });

    it("should not use a record of the same tunnel that Buttler didn't create", async () => {
      add("app.example.com");
      insert({ ...ownRecord, comment: null });
      await syncDomains();
      expect(await getStatus("app.example.com")).toMatchObject({ failure: "taken" });
    });

    it("should repair its own records when they are verified", async () => {
      add("app.example.com");
      add("www.example.com");
      await syncDomains();
      records = records.filter(({ name }) => name === "app.example.com").map(record => ({ ...record, proxied: false }));
      await syncDomains({ verify: true });
      expect(records).toMatchObject([ownRecord, { ...ownRecord, name: "www.example.com" }]);
    });

    it("should move its records to a new tunnel", async () => {
      add("app.example.com");
      await syncDomains();
      mocks.getCloudflareTunnel.mockResolvedValue({ ...tunnel, id: "new" });
      expect(await getStatus("app.example.com")).toMatchObject({ state: "pending" });
      await syncDomains();
      expect(records).toEqual([{ ...ownRecord, id: "r1", content: "new.cfargotunnel.com" }]);
    });

    it("should delete the record in the previous zone", async () => {
      add("app.example.com");
      await syncDomains();
      mocks.getZones.mockResolvedValue([zone, { ...zone, id: "sub", name: "app.example.com" }]);
      await syncDomains({ verify: true });
      expect(getRequests()).toContain("DELETE /zones/z/dns_records/r1");
      expect(await getDnsRecords(db)).toMatchObject([{ zoneId: "sub", recordId: "r2" }]);
    });
  });

  describe("failures", () => {
    it("should not create a DNS record if the tunnel can't be updated", async () => {
      add("app.example.com");
      failWith(new CloudflareApiError("invalid", 400), method => method === "PUT");
      await syncDomains();
      expect(records).toEqual([]);
      expect(await getStatus("app.example.com")).toEqual({ state: "failed", failure: "rejected", details: "invalid" });
    });

    it("should go on with the other domains if one is rejected", async () => {
      add("app.example.com");
      add("www.example.com");
      failWith(new CloudflareApiError("invalid", 400), (method, path) => method === "GET" && path.includes("app."));
      await syncDomains();
      expect(await getStatus("app.example.com")).toMatchObject({ failure: "rejected" });
      expect(await getStatus("www.example.com")).toMatchObject({ state: "active" });
    });

    it.each([
      new TypeError("fetch failed"),
      new CloudflareApiError("down", 503),
      new CloudflareApiError("slow down", 429),
    ])("should stop if Cloudflare can't be reached (%s)", async error => {
      add("app.example.com");
      add("www.example.com");
      failWith(error, method => method === "GET");
      await syncDomains();
      expect(getRequests().filter(request => request.startsWith("GET"))).toHaveLength(1);
      expect(await getStatus("app.example.com")).toMatchObject({ failure: "unreachable" });
      expect(await getStatus("www.example.com")).toMatchObject({ failure: "unreachable" });
    });

    it("should try again with growing delays", async () => {
      add("app.example.com");
      failWith(new TypeError("fetch failed"));
      await syncDomains();
      expect(mocks.cloudflareFetch).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(60_000);
      expect(mocks.cloudflareFetch).toHaveBeenCalledTimes(2);
      await vi.advanceTimersByTimeAsync(60_000);
      expect(mocks.cloudflareFetch).toHaveBeenCalledTimes(2);
      mocks.cloudflareFetch.mockImplementation(respond);
      await vi.advanceTimersByTimeAsync(60_000);
      await vi.waitFor(async () => expect(await getStatus("app.example.com")).toMatchObject({ state: "active" }));
      mocks.cloudflareFetch.mockClear();
      await vi.advanceTimersByTimeAsync(60 * 60_000);
      expect(mocks.cloudflareFetch).not.toHaveBeenCalled();
    });

    it("should not try again if only the user can solve it", async () => {
      add("app.example.com");
      insert(foreignRecord);
      await syncDomains();
      mocks.cloudflareFetch.mockClear();
      await vi.advanceTimersByTimeAsync(60 * 60_000);
      expect(mocks.cloudflareFetch).not.toHaveBeenCalled();
    });

    it("should report an expired or revoked connection", async () => {
      add("app.example.com");
      failWith(new CloudflareConnectionError());
      await syncDomains();
      expect(await getStatus("app.example.com")).toMatchObject({ state: "failed", failure: "connection_lost" });
      // Connecting again
      mocks.cloudflareFetch.mockImplementation(respond);
      await syncDomains({ verify: true });
      expect(await getStatus("app.example.com")).toMatchObject({ state: "active" });
    });

    it("should keep the status of the domains that work without the connection", async () => {
      add("app.example.com");
      await syncDomains();
      failWith(new TypeError("fetch failed"));
      await syncDomains({ verify: true });
      expect(await getStatus("app.example.com")).toMatchObject({ state: "active" });
    });

    it("should not throw if something unexpected happens", async () => {
      mocks.getCloudflareTunnel.mockRejectedValueOnce(new Error("broken"));
      await expect(syncDomains()).resolves.toBeUndefined();
    });
  });

  describe("deleteAllRecords", () => {
    beforeEach(async () => {
      add("app.example.com");
      await syncDomains();
    });

    it("should only delete the records of Buttler", async () => {
      const other = insert({ ...foreignRecord, name: "other.example.com" });
      await saveDnsRecord(db, { hostname: "other.example.com", failure: "taken", failureDetails: "A 203.0.113.1" });
      await deleteAllRecords();
      expect(records).toEqual([other]);
      expect(await getDnsRecords(db)).toEqual([]);
    });

    it("should remember the records that are not accessible anymore", async () => {
      failWith(new CloudflareApiError("forbidden", 403));
      await deleteAllRecords();
      expect(await getDnsRecords(db)).toHaveLength(1);
    });

    it("should be possible to try again", async () => {
      failWith(new CloudflareApiError("down", 503));
      await expect(deleteAllRecords()).rejects.toThrow("down");
      expect(await getDnsRecords(db)).toHaveLength(1);
    });
  });
});
