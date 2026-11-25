import { beforeEach, describe, expect, it, vi } from "vitest";
import { removeDashboardDomainAction, setDashboardDomainAction } from "./dashboard-domain";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getAccess: vi.fn(),
  getDashboardDomain: vi.fn(),
  setDashboardDomain: vi.fn(),
  deleteDashboardDomain: vi.fn(),
  syncReverseProxyConfig: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ refresh: mocks.refresh }));
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
vi.mock("~/core/nginx", () => ({ syncReverseProxyConfig: mocks.syncReverseProxyConfig }));
vi.mock("~/operations/getDashboardDomain", () => ({ default: mocks.getDashboardDomain }));
vi.mock("~/operations/setDashboardDomain", () => ({ default: mocks.setDashboardDomain }));
vi.mock("~/operations/deleteDashboardDomain", () => ({ default: mocks.deleteDashboardDomain }));

function set(hostname: string) {
  const formData = new FormData();
  formData.set("hostname", hostname);
  return setDashboardDomainAction({}, formData);
}

function remove() {
  return removeDashboardDomainAction({}, new FormData());
}

describe("dashboard domain actions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.getSession.mockResolvedValue({ userId: 1 });
    mocks.getAccess.mockResolvedValue("admin");
    mocks.getDashboardDomain.mockResolvedValue(null);
    mocks.setDashboardDomain.mockReturnValue(true);
    mocks.deleteDashboardDomain.mockResolvedValue("buttler.example.com");
  });

  it("should set the domain in lowercase and reload Nginx", async () => {
    expect(await set(" Buttler.Example.com ")).toEqual({});
    expect(mocks.setDashboardDomain.mock.calls).toEqual([[{}, "buttler.example.com"]]);
    expect(mocks.syncReverseProxyConfig).toHaveBeenCalledTimes(1);
    expect(mocks.syncReverseProxyConfig).toHaveBeenCalledAfter(mocks.setDashboardDomain);
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  it.each([
    "",
    "localhost",
    "*.example.com",
    "https://example.com",
    "example.com:80",
  ])("should reject \"%s\"", async hostname => {
    expect(await set(hostname)).toEqual({ hostname: "INVALID_HOSTNAME" });
    expect(mocks.setDashboardDomain).not.toHaveBeenCalled();
  });

  it("should reject the hostname of a service", async () => {
    mocks.setDashboardDomain.mockReturnValue(false);
    expect(await set("app.example.com")).toEqual({ "[error]": "hostname_taken" });
    expect(mocks.syncReverseProxyConfig).not.toHaveBeenCalled();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("should not keep a new domain if Nginx can't be reloaded", async () => {
    mocks.syncReverseProxyConfig.mockRejectedValue(new Error("broken"));
    expect(await set("buttler.example.com")).toEqual({ "[error]": "reload_failed" });
    expect(mocks.deleteDashboardDomain).toHaveBeenCalledTimes(1);
    expect(mocks.syncReverseProxyConfig).toHaveBeenCalledTimes(2);
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("should restore the previous domain if Nginx can't be reloaded", async () => {
    mocks.getDashboardDomain.mockResolvedValue("old.example.com");
    mocks.syncReverseProxyConfig.mockRejectedValue(new Error("broken"));
    expect(await set("buttler.example.com")).toEqual({ "[error]": "reload_failed" });
    expect(mocks.setDashboardDomain).toHaveBeenLastCalledWith({}, "old.example.com");
    expect(mocks.deleteDashboardDomain).not.toHaveBeenCalled();
  });

  it("should remove the domain and reload Nginx", async () => {
    expect(await remove()).toEqual({});
    expect(mocks.syncReverseProxyConfig).toHaveBeenCalledTimes(1);
    expect(mocks.syncReverseProxyConfig).toHaveBeenCalledAfter(mocks.deleteDashboardDomain);
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  it("should keep the domain if Nginx can't be reloaded without it", async () => {
    mocks.syncReverseProxyConfig.mockRejectedValue(new Error("broken"));
    expect(await remove()).toEqual({ "[error]": "reload_failed" });
    expect(mocks.setDashboardDomain).toHaveBeenCalledWith({}, "buttler.example.com");
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("should report that there is no domain to remove", async () => {
    mocks.deleteDashboardDomain.mockResolvedValue(undefined);
    expect(await remove()).toEqual({ "[error]": "remove_failed" });
    expect(mocks.syncReverseProxyConfig).not.toHaveBeenCalled();
  });

  it("should reject the users who are not the admin", async () => {
    mocks.getAccess.mockResolvedValue("member");
    await expect(set("buttler.example.com")).rejects.toThrow("403");
    await expect(remove()).rejects.toThrow("403");
    expect(mocks.setDashboardDomain).not.toHaveBeenCalled();
    expect(mocks.deleteDashboardDomain).not.toHaveBeenCalled();
  });
});
