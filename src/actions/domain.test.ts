import { beforeEach, describe, expect, it, vi } from "vitest";
import { addDomainAction, removeDomainAction } from "./domain";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getAccess: vi.fn(),
  getService: vi.fn(),
  createDomain: vi.fn(),
  deleteDomain: vi.fn(),
  syncIngressNetwork: vi.fn(),
  syncReverseProxyConfig: vi.fn(),
  updateTag: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ updateTag: mocks.updateTag }));
vi.mock("next/server", () => ({ connection: vi.fn() }));
vi.mock("next/navigation", () => ({
  unauthorized: () => {
    throw new Error("401");
  },
  forbidden: () => {
    throw new Error("403");
  },
}));
vi.mock("~/database", () => ({ default: {} }));
vi.mock("~/core/session", () => ({ getSession: mocks.getSession }));
vi.mock("~/core/access", () => ({ getAccess: mocks.getAccess }));
vi.mock("~/core/settings", () => ({}));
vi.mock("~/core/docker/ingress", () => ({ syncIngressNetwork: mocks.syncIngressNetwork }));
vi.mock("~/core/nginx", () => ({ syncReverseProxyConfig: mocks.syncReverseProxyConfig }));
vi.mock("~/operations/getService", () => ({ default: mocks.getService }));
vi.mock("~/operations/createDomain", () => ({ default: mocks.createDomain }));
vi.mock("~/operations/deleteDomain", () => ({ default: mocks.deleteDomain }));

function add(hostname: string, port = "3000") {
  const formData = new FormData();
  formData.set("hostname", hostname);
  formData.set("port", port);
  return addDomainAction("srv", {}, formData);
}

const domain = { hostname: "app.example.com", serviceId: "srv", port: 3000, createdAt: "2026-11-25 10:00:00" };

describe("domain actions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getSession.mockResolvedValue({ userId: 1 });
    mocks.getAccess.mockResolvedValue("admin");
    mocks.getService.mockResolvedValue({ id: "srv", type: "github" });
    mocks.createDomain.mockResolvedValue(true);
    mocks.deleteDomain.mockResolvedValue(domain);
  });

  it("should add a domain in lowercase", async () => {
    expect(await add(" App.Example.com ")).toEqual({});
    expect(mocks.createDomain).toHaveBeenCalledWith({}, { hostname: "app.example.com", serviceId: "srv", port: 3000 });
    expect(mocks.updateTag).toHaveBeenCalledWith("getSingleService(srv)");
  });

  it("should connect the service after a domain is added", async () => {
    await add("app.example.com");
    expect(mocks.syncIngressNetwork).toHaveBeenCalledWith("srv");
    expect(mocks.syncIngressNetwork).toHaveBeenCalledAfter(mocks.createDomain);
  });

  it("should not keep the domain if the service can't be connected", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.syncIngressNetwork.mockRejectedValue(new Error("no docker"));
    expect(await add("app.example.com")).toEqual({ "[error]": "connect_failed" });
    expect(mocks.deleteDomain).toHaveBeenCalledWith({}, "srv", "app.example.com");
    expect(mocks.updateTag).not.toHaveBeenCalled();
  });

  it("should reload Nginx after a domain is added", async () => {
    await add("app.example.com");
    expect(mocks.syncReverseProxyConfig).toHaveBeenCalledTimes(1);
    expect(mocks.syncReverseProxyConfig).toHaveBeenCalledAfter(mocks.createDomain);
  });

  it("should not keep the domain if Nginx can't be reloaded", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.syncReverseProxyConfig.mockRejectedValue(new Error("broken"));
    expect(await add("app.example.com")).toEqual({ "[error]": "reload_failed" });
    expect(mocks.deleteDomain).toHaveBeenCalledWith({}, "srv", "app.example.com");
    // Once for the new domain, once without it
    expect(mocks.syncIngressNetwork).toHaveBeenCalledTimes(2);
    expect(mocks.syncReverseProxyConfig).toHaveBeenCalledTimes(2);
    expect(mocks.updateTag).not.toHaveBeenCalled();
  });

  it("should reject invalid hostnames", async () => {
    expect(await add("*.example.com")).toEqual({ hostname: "INVALID_HOSTNAME" });
    expect(mocks.createDomain).not.toHaveBeenCalled();
  });

  it.each(["", "0", "65536", "80.5", "http"])("should reject the port \"%s\"", async port => {
    expect(await add("app.example.com", port)).toEqual({ port: "INVALID_PORT" });
    expect(mocks.createDomain).not.toHaveBeenCalled();
  });

  it("should reject hostnames that are already taken", async () => {
    mocks.createDomain.mockResolvedValue(false);
    expect(await add("app.example.com")).toEqual({ "[error]": "hostname_taken" });
    expect(mocks.updateTag).not.toHaveBeenCalled();
  });

  it.each([null, { id: "srv", type: "system" }])("should not add domains to unknown and system services", async service => {
    mocks.getService.mockResolvedValue(service);
    expect(await add("app.example.com")).toEqual({ "[error]": "add_failed" });
    expect(mocks.createDomain).not.toHaveBeenCalled();
  });

  it("should remove a domain", async () => {
    expect(await removeDomainAction("srv", "app.example.com", {}, new FormData())).toEqual({});
    expect(mocks.deleteDomain).toHaveBeenCalledWith({}, "srv", "app.example.com");
    expect(mocks.updateTag).toHaveBeenCalledWith("getSingleService(srv)");
  });

  it("should disconnect the service after a domain is removed", async () => {
    await removeDomainAction("srv", "app.example.com", {}, new FormData());
    expect(mocks.syncIngressNetwork).toHaveBeenCalledWith("srv");
    expect(mocks.syncIngressNetwork).toHaveBeenCalledAfter(mocks.deleteDomain);
  });

  it("should remove the domain even if the service can't be disconnected", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.syncIngressNetwork.mockRejectedValue(new Error("no docker"));
    expect(await removeDomainAction("srv", "app.example.com", {}, new FormData())).toEqual({});
    expect(mocks.updateTag).toHaveBeenCalledWith("getSingleService(srv)");
  });

  it("should reload Nginx before the service is disconnected", async () => {
    await removeDomainAction("srv", "app.example.com", {}, new FormData());
    expect(mocks.syncReverseProxyConfig).toHaveBeenCalledAfter(mocks.deleteDomain);
    expect(mocks.syncReverseProxyConfig).toHaveBeenCalledBefore(mocks.syncIngressNetwork);
  });

  it("should keep the domain if Nginx can't be reloaded without it", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.syncReverseProxyConfig.mockRejectedValue(new Error("broken"));
    expect(await removeDomainAction("srv", "app.example.com", {}, new FormData())).toEqual({ "[error]": "reload_failed" });
    expect(mocks.createDomain).toHaveBeenCalledWith({}, domain);
    expect(mocks.updateTag).not.toHaveBeenCalled();
  });

  it("should report the domains that can't be removed", async () => {
    mocks.deleteDomain.mockResolvedValue(undefined);
    expect(await removeDomainAction("srv", "app.example.com", {}, new FormData())).toEqual({ "[error]": "remove_failed" });
    expect(mocks.updateTag).not.toHaveBeenCalled();
  });

  it("should reject the users who are not the admin", async () => {
    mocks.getAccess.mockResolvedValue("member");
    await expect(add("app.example.com")).rejects.toThrow("403");
    await expect(removeDomainAction("srv", "app.example.com", {}, new FormData())).rejects.toThrow("403");
    expect(mocks.createDomain).not.toHaveBeenCalled();
    expect(mocks.deleteDomain).not.toHaveBeenCalled();
  });
});
