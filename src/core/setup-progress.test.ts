import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSetupProgress } from "./setup-progress";

const mocks = vi.hoisted(() => ({
  getConnectionState: vi.fn(),
  getTunnelInfo: vi.fn(),
  getDashboardDomain: vi.fn(),
  getDomainStatuses: vi.fn(),
  getDomainZones: vi.fn(),
  checkReachability: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("~/database", () => ({ default: {} }));
vi.mock("~/operations/getDashboardDomain", () => ({ default: mocks.getDashboardDomain }));
vi.mock("./cloudflare/connection", () => ({ getConnectionState: mocks.getConnectionState }));
vi.mock("./cloudflare/domains", () => ({
  getDomainStatuses: mocks.getDomainStatuses,
  getDomainZones: mocks.getDomainZones,
}));
vi.mock("./cloudflare/tunnel", () => ({ getTunnelInfo: mocks.getTunnelInfo }));
vi.mock("./reachability", () => ({ checkReachability: mocks.checkReachability }));

const hostname = "buttler.example.com";
const active = { state: "active", failure: null, details: null };

describe("getSetupProgress", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.getConnectionState.mockResolvedValue("connected");
    mocks.getTunnelInfo.mockResolvedValue({ accountId: "acc", serviceId: "s" });
    mocks.getDashboardDomain.mockResolvedValue(hostname);
    mocks.getDomainStatuses.mockResolvedValue([active]);
    mocks.getDomainZones.mockResolvedValue([{ id: "z", name: "example.com" }]);
    mocks.checkReachability.mockResolvedValue(null);
  });

  it.each(["disconnected", "lost"])("should start with Cloudflare (%s)", async state => {
    mocks.getConnectionState.mockResolvedValue(state);
    expect(await getSetupProgress()).toEqual({ step: "cloudflare" });
    expect(mocks.checkReachability).not.toHaveBeenCalled();
  });

  it("should need the tunnel", async () => {
    mocks.getTunnelInfo.mockResolvedValue(null);
    expect(await getSetupProgress()).toEqual({ step: "cloudflare" });
  });

  it("should continue with the domain", async () => {
    mocks.getDashboardDomain.mockResolvedValue(null);
    expect(await getSetupProgress()).toEqual({ step: "domain", hostname: null });
  });

  it("should not check a domain that Cloudflare is not up to date with", async () => {
    const status = { state: "failed", failure: "taken", details: "A 1.2.3.4" };
    mocks.getDomainStatuses.mockResolvedValue([status]);
    expect(await getSetupProgress()).toEqual({ step: "domain", hostname, status, problem: null });
    expect(mocks.checkReachability).not.toHaveBeenCalled();
  });

  it("should stay at a domain that isn't reachable", async () => {
    const problem = { reason: "no_tunnel", details: "530" };
    mocks.checkReachability.mockResolvedValue(problem);
    expect(await getSetupProgress()).toEqual({ step: "domain", hostname, status: active, problem });
  });

  it("should continue with the GitHub App if the domain is reachable", async () => {
    expect(await getSetupProgress()).toEqual({ step: "github", hostname });
    expect(mocks.checkReachability).toHaveBeenCalledWith(hostname, "example.com");
  });

  it("should also check the domain if the zones can't be loaded", async () => {
    mocks.getDomainZones.mockRejectedValue(new Error("offline"));
    expect(await getSetupProgress()).toEqual({ step: "github", hostname });
    expect(mocks.checkReachability).toHaveBeenCalledWith(hostname, undefined);
  });
});
