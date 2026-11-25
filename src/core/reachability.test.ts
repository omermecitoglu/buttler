import { EventEmitter } from "node:events";
import { Readable } from "node:stream";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkReachability, getInstanceId } from "./reachability";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  resolveNs: vi.fn(),
  resolve4: vi.fn(),
  setServers: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("node:https", () => ({ default: { get: mocks.get } }));
vi.mock("node:dns/promises", () => ({
  Resolver: class {
    resolveNs = mocks.resolveNs;
    resolve4 = mocks.resolve4;
    setServers = mocks.setServers;
  },
}));

const HOSTNAME = "buttler.example.com";

type Callback = (response: Readable & { statusCode?: number }) => void;

function respond(statusCode: number, body: string) {
  mocks.get.mockImplementation((_options: unknown, callback: Callback) => {
    callback(Object.assign(Readable.from([Buffer.from(body)]), { statusCode }));
    return new EventEmitter();
  });
}

function fail(error: Error) {
  mocks.get.mockImplementation(() => {
    const request = new EventEmitter();
    queueMicrotask(() => request.emit("error", error));
    return request;
  });
}

function createError(code: string) {
  return Object.assign(new Error(code), { code });
}

function check() {
  return checkReachability(HOSTNAME, "example.com");
}

describe("checkReachability", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.resolveNs.mockResolvedValue(["ns.cloudflare.com"]);
    mocks.resolve4.mockImplementation((name: string) => Promise.resolve([name === HOSTNAME ? "104.16.0.1" : "173.245.0.1"]));
    respond(200, getInstanceId());
  });

  it("should recognize this instance", async () => {
    expect(await check()).toBeNull();
  });

  it("should use the address from the name servers of the zone", async () => {
    await check();
    expect(mocks.resolveNs).toHaveBeenCalledWith("example.com");
    expect(mocks.setServers).toHaveBeenCalledWith(["173.245.0.1"]);
    expect(mocks.get.mock.calls[0][0]).toMatchObject({
      host: "104.16.0.1",
      servername: HOSTNAME,
      headers: { Host: HOSTNAME },
    });
  });

  it.each(["ENOTFOUND", "ENODATA"])("should not ask the resolver of the computer for a hostname that doesn't exist yet (%s)", async code => {
    mocks.resolve4.mockImplementation((name: string) => (
      name === HOSTNAME ? Promise.reject(createError(code)) : Promise.resolve(["173.245.0.1"])
    ));
    expect(await check()).toEqual({ reason: "unknown_host", details: "" });
    expect(mocks.get).not.toHaveBeenCalled();
  });

  it("should use the resolver of the computer if the name servers can't be found", async () => {
    mocks.resolveNs.mockRejectedValue(createError("ETIMEOUT"));
    expect(await check()).toBeNull();
    expect(mocks.get.mock.calls[0][0]).toMatchObject({ host: HOSTNAME });
  });

  it("should use the resolver of the computer if the name servers don't answer", async () => {
    mocks.resolve4.mockImplementation((name: string) => (
      name === HOSTNAME ? Promise.reject(createError("ETIMEOUT")) : Promise.resolve(["173.245.0.1"])
    ));
    expect(await check()).toBeNull();
    expect(mocks.get.mock.calls[0][0]).toMatchObject({ host: HOSTNAME });
  });

  it("should use the resolver of the computer if the zone is not known", async () => {
    expect(await checkReachability(HOSTNAME)).toBeNull();
    expect(mocks.resolveNs).not.toHaveBeenCalled();
    expect(mocks.get.mock.calls[0][0]).toMatchObject({ host: HOSTNAME });
  });

  it.each([
    { status: 530, reason: "no_tunnel" },
    { status: 502, reason: "no_dashboard" },
    { status: 504, reason: "no_dashboard" },
    { status: 404, reason: "other_response" },
    { status: 302, reason: "other_response" },
    { status: 403, reason: "other_response" },
  ])("should explain status $status", async ({ status, reason }) => {
    respond(status, "");
    expect(await check()).toEqual({ reason, details: `${status}` });
  });

  it("should not accept another instance", async () => {
    respond(200, "other");
    expect(await check()).toEqual({ reason: "other_response", details: "200" });
  });

  it("should report a failed connection", async () => {
    fail(new Error("certificate has expired"));
    expect(await check()).toEqual({ reason: "no_connection", details: "certificate has expired" });
  });

  it("should report a hostname that the computer doesn't know", async () => {
    fail(createError("ENOTFOUND"));
    expect(await checkReachability(HOSTNAME)).toEqual({ reason: "unknown_host", details: "" });
  });
});
