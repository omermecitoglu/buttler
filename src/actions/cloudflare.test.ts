import { beforeEach, describe, expect, it, vi } from "vitest";
import { connectCloudflareAction, disconnectCloudflareAction, setUpTunnelAction } from "./cloudflare";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getAccess: vi.fn(),
  disconnectCloudflare: vi.fn(),
  removeTunnel: vi.fn(),
  setUpTunnel: vi.fn(),
  getZones: vi.fn(),
  syncDomains: vi.fn(),
  refresh: vi.fn(),
  updateTag: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ refresh: mocks.refresh, updateTag: mocks.updateTag }));
vi.mock("next/server", () => ({ connection: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect ${url}`);
  },
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
vi.mock("~/core/cloudflare/connection", () => ({ disconnectCloudflare: mocks.disconnectCloudflare }));
vi.mock("~/core/cloudflare/domains", () => ({ syncDomains: mocks.syncDomains }));
vi.mock("~/core/cloudflare/zones", () => ({ getZones: mocks.getZones }));
vi.mock("~/core/cloudflare/tunnel", () => ({
  getAccounts: (zones: { accountId: string }[]) => zones.map(({ accountId }) => ({ id: accountId })),
  removeTunnel: mocks.removeTunnel,
  setUpTunnel: mocks.setUpTunnel,
}));

function setUp(accountId: string) {
  const formData = new FormData();
  formData.set("accountId", accountId);
  return setUpTunnelAction({}, formData);
}

describe("Cloudflare actions", () => {
  const session: Record<string, unknown> = {};

  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    Object.assign(session, { userId: 1, cloudflare: undefined, save: vi.fn() });
    mocks.getSession.mockResolvedValue(session);
    mocks.getAccess.mockResolvedValue("admin");
    mocks.getZones.mockResolvedValue([{ accountId: "acc" }]);
  });

  it("should make the domains reachable after the tunnel is set up", async () => {
    expect(await setUp("acc")).toEqual({});
    expect(mocks.syncDomains).toHaveBeenCalledWith({ verify: true });
    expect(mocks.syncDomains).toHaveBeenCalledAfter(mocks.setUpTunnel);
  });

  it("should remember the authorization in the session before leaving", async () => {
    const error = await connectCloudflareAction({}, new FormData()).catch((reason: unknown) => reason);
    const url = new URL((error as Error).message.replace("redirect ", ""));
    expect(url.hostname).toBe("dash.cloudflare.com");
    expect(session.cloudflare).toEqual({
      state: url.searchParams.get("state"),
      verifier: expect.any(String),
      expiresAt: expect.any(Number),
    });
    expect(session.save).toHaveBeenCalledTimes(1);
  });

  it("should disconnect", async () => {
    expect(await disconnectCloudflareAction({}, new FormData())).toEqual({});
    expect(mocks.disconnectCloudflare).toHaveBeenCalledTimes(1);
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  it("should delete the tunnel before disconnecting", async () => {
    await disconnectCloudflareAction({}, new FormData());
    expect(mocks.removeTunnel).toHaveBeenCalledBefore(mocks.disconnectCloudflare);
  });

  it("should stay connected if the tunnel can't be deleted", async () => {
    mocks.removeTunnel.mockRejectedValue(new Error("offline"));
    expect(await disconnectCloudflareAction({}, new FormData())).toEqual({ "[error]": "disconnect_failed" });
    expect(mocks.disconnectCloudflare).not.toHaveBeenCalled();
  });

  it("should set the tunnel up", async () => {
    expect(await setUp("acc")).toEqual({});
    expect(mocks.setUpTunnel).toHaveBeenCalledWith("acc");
    expect(mocks.updateTag).toHaveBeenCalledWith("getAllServices()");
  });

  it("should only use the accounts that were chosen", async () => {
    expect(await setUp("other")).toEqual({ "[error]": "setup_failed" });
    expect(mocks.setUpTunnel).not.toHaveBeenCalled();
  });

  it("should report that the tunnel can't be set up", async () => {
    mocks.setUpTunnel.mockRejectedValue(new Error("no docker"));
    expect(await setUp("acc")).toEqual({ "[error]": "setup_failed" });
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("should report that it can't be disconnected", async () => {
    mocks.disconnectCloudflare.mockRejectedValue(new Error("offline"));
    expect(await disconnectCloudflareAction({}, new FormData())).toEqual({ "[error]": "disconnect_failed" });
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("should reject the users who are not the admin", async () => {
    mocks.getAccess.mockResolvedValue("member");
    await expect(connectCloudflareAction({}, new FormData())).rejects.toThrow("403");
    await expect(disconnectCloudflareAction({}, new FormData())).rejects.toThrow("403");
    await expect(setUp("acc")).rejects.toThrow("403");
    expect(session.cloudflare).toBeUndefined();
    expect(mocks.setUpTunnel).not.toHaveBeenCalled();
    expect(mocks.removeTunnel).not.toHaveBeenCalled();
    expect(mocks.disconnectCloudflare).not.toHaveBeenCalled();
  });
});
