import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CloudflareTunnel } from "~/models/cloudflare";
import { CloudflareApiError } from "./errors";
import { getAccounts, getTunnelInfo, provisionTunnel, removeTunnel, setUpTunnel, setUpTunnelAfterConnecting } from "./tunnel";

const mocks = vi.hoisted(() => ({
  cloudflareFetch: vi.fn(),
  getConnectionState: vi.fn(),
  getZones: vi.fn(),
  startTunnelContainer: vi.fn(),
  removeTunnelContainer: vi.fn(),
  deleteService: vi.fn(),
  deleteAllRecords: vi.fn(),
}));

let saved: CloudflareTunnel | null = null;
let hasService = false;

vi.mock("server-only", () => ({}));
vi.mock("~/database", () => ({ default: {} }));
vi.mock("./client", () => ({ cloudflareFetch: mocks.cloudflareFetch }));
vi.mock("./connection", () => ({ getConnectionState: mocks.getConnectionState }));
vi.mock("./records", () => ({ deleteAllRecords: mocks.deleteAllRecords }));
vi.mock("./zones", () => ({ getZones: mocks.getZones }));
vi.mock("~/core/docker/tunnel", () => ({
  startTunnelContainer: mocks.startTunnelContainer,
  removeTunnelContainer: mocks.removeTunnelContainer,
}));
vi.mock("~/operations/getCloudflareTunnel", () => ({ default: () => Promise.resolve(saved) }));
vi.mock("~/operations/saveCloudflareTunnel", () => ({
  default: (_db: unknown, tunnel: CloudflareTunnel) => {
    saved = tunnel;
    return Promise.resolve();
  },
}));
vi.mock("~/operations/deleteCloudflareTunnel", () => ({
  default: () => {
    saved = null;
    return Promise.resolve();
  },
}));
vi.mock("~/operations/ensureTunnelService", () => ({
  default: () => {
    hasService = true;
    return Promise.resolve({ id: "srv" });
  },
}));
vi.mock("~/operations/getTunnelService", () => ({ default: () => Promise.resolve(hasService ? { id: "srv" } : undefined) }));
vi.mock("~/operations/deleteService", () => ({ default: mocks.deleteService }));

const zone = { id: "z", name: "example.com", accountId: "acc", accountName: "Account" };
const tunnel = { id: "tunnel", accountId: "acc", token: "token" };

/** The requests that were sent, without their bodies */
function getRequests() {
  return mocks.cloudflareFetch.mock.calls.map(([path, init]) => {
    const { method = "GET" } = (init ?? {}) as RequestInit;
    return `${method} ${path as string}`;
  });
}

function respond(path: string, init?: RequestInit) {
  if (path.endsWith("/token")) return Promise.resolve({ result: "token" });
  if (init?.method === "POST") return Promise.resolve({ result: { id: "new" } });
  return Promise.resolve({ result: { id: "tunnel", deleted_at: null } });
}

describe("Cloudflare tunnel", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    saved = null;
    hasService = false;
    mocks.cloudflareFetch.mockImplementation(respond);
    mocks.getConnectionState.mockResolvedValue("connected");
    mocks.getZones.mockResolvedValue([zone]);
  });

  describe("setUpTunnel", () => {
    it("should create a tunnel that answers everything with a 404", async () => {
      await setUpTunnel("acc");
      expect(getRequests()).toEqual([
        "POST /accounts/acc/cfd_tunnel",
        "PUT /accounts/acc/cfd_tunnel/new/configurations",
        "GET /accounts/acc/cfd_tunnel/new/token",
      ]);
      expect(JSON.parse(mocks.cloudflareFetch.mock.calls[0][1].body as string)).toEqual({
        name: expect.stringMatching(/^buttler-[0-9a-f]{8}$/),
        config_src: "cloudflare",
      });
      expect(JSON.parse(mocks.cloudflareFetch.mock.calls[1][1].body as string)).toEqual({
        config: { ingress: [{ service: "http_status:404" }] },
      });
      expect(saved).toEqual({ id: "new", accountId: "acc", token: "token" });
      expect(mocks.startTunnelContainer).toHaveBeenCalledWith({ serviceId: "srv", tunnelId: "new", token: "token" });
    });

    it("should use the tunnel that exists already", async () => {
      saved = tunnel;
      await setUpTunnel("acc");
      expect(getRequests()).toEqual(["GET /accounts/acc/cfd_tunnel/tunnel"]);
      expect(mocks.startTunnelContainer).toHaveBeenCalledWith({ serviceId: "srv", tunnelId: "tunnel", token: "token" });
    });

    it("should only create one tunnel for simultaneous requests", async () => {
      await Promise.all([setUpTunnel("acc"), setUpTunnel("acc")]);
      expect(getRequests().filter(request => request.startsWith("POST"))).toHaveLength(1);
    });

    it("should replace a tunnel that was deleted in Cloudflare", async () => {
      saved = tunnel;
      mocks.cloudflareFetch.mockResolvedValueOnce({ result: { id: "tunnel", deleted_at: "2026-11-25T00:00:00Z" } });
      await setUpTunnel("acc");
      expect(saved).toMatchObject({ id: "new" });
      mocks.cloudflareFetch.mockRejectedValueOnce(new CloudflareApiError("not found", 404));
      await setUpTunnel("acc");
      expect(getRequests().filter(request => request.startsWith("POST"))).toHaveLength(2);
    });

    it("should not replace a tunnel that can't be looked up", async () => {
      saved = tunnel;
      mocks.cloudflareFetch.mockRejectedValueOnce(new CloudflareApiError("down", 503));
      await expect(setUpTunnel("acc")).rejects.toThrow("down");
      expect(saved).toEqual(tunnel);
      expect(mocks.startTunnelContainer).not.toHaveBeenCalled();
    });

    it("should delete the tunnel before one is created in another account", async () => {
      saved = tunnel;
      await setUpTunnel("other");
      expect(mocks.removeTunnelContainer).toHaveBeenCalledBefore(mocks.cloudflareFetch);
      expect(getRequests().slice(0, 3)).toEqual([
        "DELETE /accounts/acc/cfd_tunnel/tunnel/connections",
        "DELETE /accounts/acc/cfd_tunnel/tunnel",
        "POST /accounts/other/cfd_tunnel",
      ]);
      expect(saved).toMatchObject({ id: "new", accountId: "other" });
    });

    it("should delete the DNS records before another account is used", async () => {
      saved = tunnel;
      await setUpTunnel("other");
      expect(mocks.deleteAllRecords).toHaveBeenCalledBefore(mocks.removeTunnelContainer);
    });

    it("should not leave a tunnel behind if it can't be deleted", async () => {
      saved = tunnel;
      mocks.cloudflareFetch.mockRejectedValueOnce(new CloudflareApiError("down", 503));
      await expect(setUpTunnel("other")).rejects.toThrow("down");
      expect(saved).toEqual(tunnel);
      expect(getRequests().some(request => request.startsWith("POST"))).toBe(false);
    });

    it.each([403, 404])("should replace a tunnel of another account that is gone (%d)", async status => {
      saved = tunnel;
      mocks.cloudflareFetch
        .mockRejectedValueOnce(new CloudflareApiError("gone", status))
        .mockRejectedValueOnce(new CloudflareApiError("gone", status));
      await setUpTunnel("other");
      expect(saved).toMatchObject({ id: "new", accountId: "other" });
    });

    it("should go on with the same tunnel after a failure", async () => {
      mocks.cloudflareFetch.mockImplementationOnce(respond).mockRejectedValueOnce(new Error("offline"));
      await expect(setUpTunnel("acc")).rejects.toThrow("offline");
      expect(saved).toEqual({ id: "new", accountId: "acc", token: null });
      expect(await getTunnelInfo()).toBeNull();
      await setUpTunnel("acc");
      expect(getRequests().filter(request => request.startsWith("POST"))).toHaveLength(1);
      expect(saved).toMatchObject({ id: "new", token: "token" });
    });
  });

  describe("setUpTunnelAfterConnecting", () => {
    it("should use the only account", async () => {
      expect(await setUpTunnelAfterConnecting()).toBe(true);
      expect(saved).toMatchObject({ accountId: "acc" });
    });

    it("should let the admin choose between multiple accounts", async () => {
      mocks.getZones.mockResolvedValue([zone, { ...zone, accountId: "other" }]);
      expect(await setUpTunnelAfterConnecting()).toBe(false);
      expect(mocks.cloudflareFetch).not.toHaveBeenCalled();
    });

    it("should keep the account of the tunnel", async () => {
      saved = { ...tunnel, accountId: "other" };
      mocks.getZones.mockResolvedValue([zone, { ...zone, accountId: "other" }]);
      expect(await setUpTunnelAfterConnecting()).toBe(true);
      expect(getRequests()).toEqual(["GET /accounts/other/cfd_tunnel/tunnel"]);
    });

    it("should do nothing without a zone", async () => {
      mocks.getZones.mockResolvedValue([]);
      expect(await setUpTunnelAfterConnecting()).toBe(false);
    });
  });

  describe("provisionTunnel", () => {
    it.each(["connected", "lost"])("should start cloudflared without Cloudflare if the connection is %s", async state => {
      saved = tunnel;
      mocks.getConnectionState.mockResolvedValue(state);
      expect(await provisionTunnel()).toBe(true);
      expect(mocks.startTunnelContainer).toHaveBeenCalledTimes(1);
      expect(mocks.cloudflareFetch).not.toHaveBeenCalled();
    });

    it("should not start without a complete tunnel", async () => {
      expect(await provisionTunnel()).toBe(false);
      saved = { ...tunnel, token: null };
      expect(await provisionTunnel()).toBe(false);
      expect(mocks.startTunnelContainer).not.toHaveBeenCalled();
    });

    it("should not start without a connection", async () => {
      saved = tunnel;
      mocks.getConnectionState.mockResolvedValue("disconnected");
      expect(await provisionTunnel()).toBe(false);
      expect(mocks.startTunnelContainer).not.toHaveBeenCalled();
    });
  });

  describe("removeTunnel", () => {
    beforeEach(() => {
      saved = tunnel;
      hasService = true;
    });

    it("should stop cloudflared before the tunnel is deleted", async () => {
      await removeTunnel();
      expect(mocks.removeTunnelContainer).toHaveBeenCalledBefore(mocks.cloudflareFetch);
      expect(getRequests()).toEqual([
        "DELETE /accounts/acc/cfd_tunnel/tunnel/connections",
        "DELETE /accounts/acc/cfd_tunnel/tunnel",
      ]);
      expect(saved).toBeNull();
      expect(mocks.deleteService).toHaveBeenCalledWith({}, "srv");
    });

    it("should delete the DNS records first", async () => {
      await removeTunnel();
      expect(mocks.deleteAllRecords).toHaveBeenCalledBefore(mocks.removeTunnelContainer);
    });

    it("should keep the tunnel if the DNS records can't be deleted", async () => {
      mocks.deleteAllRecords.mockRejectedValue(new CloudflareApiError("down", 503));
      await expect(removeTunnel()).rejects.toThrow("down");
      expect(mocks.removeTunnelContainer).not.toHaveBeenCalled();
      expect(saved).toEqual(tunnel);
    });

    it("should be possible to try again", async () => {
      mocks.cloudflareFetch.mockRejectedValue(new CloudflareApiError("down", 503));
      await expect(removeTunnel()).rejects.toThrow("down");
      expect(saved).toEqual(tunnel);
      expect(mocks.deleteService).not.toHaveBeenCalled();
    });

    it.each([403, 404])("should ignore a tunnel that is gone (%d)", async status => {
      mocks.cloudflareFetch.mockRejectedValue(new CloudflareApiError("gone", status));
      await removeTunnel();
      expect(saved).toBeNull();
    });

    it("should not need Cloudflare if the connection is lost", async () => {
      mocks.getConnectionState.mockResolvedValue("lost");
      await removeTunnel();
      expect(mocks.cloudflareFetch).not.toHaveBeenCalled();
      expect(saved).toBeNull();
    });
  });

  it("should list each account once", () => {
    expect(getAccounts([zone, { ...zone, id: "y" }, { ...zone, accountId: "other", accountName: "Other" }])).toEqual([
      { id: "acc", name: "Account" },
      { id: "other", name: "Other" },
    ]);
  });

  it("should not return the token", async () => {
    saved = tunnel;
    hasService = true;
    expect(await getTunnelInfo()).toEqual({ accountId: "acc", serviceId: "srv" });
  });
});
