import { beforeEach, describe, expect, it, vi } from "vitest";
import { retryDomainAction } from "./setup";

const mocks = vi.hoisted(() => ({
  requireSetupOrAdmin: vi.fn(),
  provisionReverseProxy: vi.fn(),
  provisionTunnel: vi.fn(),
  syncDomains: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ refresh: mocks.refresh }));
vi.mock("~/core/auth", () => ({ requireSetupOrAdmin: mocks.requireSetupOrAdmin }));
vi.mock("~/core/cloudflare/domains", () => ({ syncDomains: mocks.syncDomains }));
vi.mock("~/core/cloudflare/tunnel", () => ({ provisionTunnel: mocks.provisionTunnel }));
vi.mock("~/core/nginx", () => ({ provisionReverseProxy: mocks.provisionReverseProxy }));

function retry() {
  return retryDomainAction({}, new FormData());
}

describe("retryDomainAction", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("should repair everything that the domain needs", async () => {
    expect(await retry()).toEqual({});
    expect(mocks.provisionTunnel).toHaveBeenCalledAfter(mocks.provisionReverseProxy);
    expect(mocks.syncDomains).toHaveBeenCalledAfter(mocks.provisionTunnel);
    expect(mocks.syncDomains).toHaveBeenCalledWith({ verify: true });
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  it("should try the rest if something fails", async () => {
    mocks.provisionReverseProxy.mockRejectedValue(new Error("no docker"));
    mocks.provisionTunnel.mockRejectedValue(new Error("no docker"));
    expect(await retry()).toEqual({});
    expect(mocks.syncDomains).toHaveBeenCalledTimes(1);
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  it("should be rejected outside of the setup", async () => {
    mocks.requireSetupOrAdmin.mockRejectedValue(new Error("403"));
    await expect(retry()).rejects.toThrow("403");
    expect(mocks.provisionReverseProxy).not.toHaveBeenCalled();
    expect(mocks.syncDomains).not.toHaveBeenCalled();
  });
});
