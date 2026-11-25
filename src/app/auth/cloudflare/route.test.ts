import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getPublicOrigin: vi.fn(),
  requireAdmin: vi.fn(),
  connectCloudflare: vi.fn(),
  setUpTunnelAfterConnecting: vi.fn(),
  revalidateTag: vi.fn(),
  getDashboardDomain: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidateTag: mocks.revalidateTag }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect ${url}`);
  },
}));
vi.mock("~/core/auth", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("~/core/cloudflare/connection", () => ({ connectCloudflare: mocks.connectCloudflare }));
vi.mock("~/core/cloudflare/tunnel", () => ({ setUpTunnelAfterConnecting: mocks.setUpTunnelAfterConnecting }));
vi.mock("~/core/headers", () => ({ getPublicOrigin: mocks.getPublicOrigin }));
vi.mock("~/core/session", () => ({ getSession: mocks.getSession }));
vi.mock("~/database", () => ({ default: {} }));
vi.mock("~/operations/getDashboardDomain", () => ({ default: mocks.getDashboardDomain }));

import { GET } from "./route";

const INVALID = "redirect /settings?cloudflare=invalid_state";

function createSession(expiresAt = Date.now() + 60_000) {
  return { cloudflare: { state: "state", verifier: "verifier", expiresAt }, save: vi.fn() };
}

async function call(query: string) {
  const error = await GET(new Request(`http://localhost:7777/auth/cloudflare?${query}`)).catch((reason: unknown) => reason);
  return (error as Error).message;
}

describe("GET /auth/cloudflare", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.getSession.mockResolvedValue(createSession());
    mocks.getPublicOrigin.mockResolvedValue("http://localhost:7777");
    mocks.getDashboardDomain.mockResolvedValue(null);
  });

  it("should connect, and not keep the code in the address bar", async () => {
    expect(await call("code=abc&state=state")).toBe("redirect /settings");
    expect(mocks.connectCloudflare).toHaveBeenCalledWith("abc", "verifier");
  });

  it("should set the tunnel up after connecting", async () => {
    await call("code=abc&state=state");
    expect(mocks.setUpTunnelAfterConnecting).toHaveBeenCalledAfter(mocks.connectCloudflare);
    expect(mocks.revalidateTag).toHaveBeenCalledWith("getAllServices()", { expire: 0 });
  });

  it("should stay connected if the tunnel can't be set up", async () => {
    mocks.setUpTunnelAfterConnecting.mockRejectedValue(new Error("no docker"));
    expect(await call("code=abc&state=state")).toBe("redirect /settings");
  });

  it("should use the authorization only once", async () => {
    const session = createSession();
    mocks.getSession.mockResolvedValue(session);
    mocks.connectCloudflare.mockImplementation(() => {
      expect(session.cloudflare).toBeUndefined();
      expect(session.save).toHaveBeenCalledTimes(1);
    });
    await call("code=abc&state=state");
    expect(mocks.connectCloudflare).toHaveBeenCalledTimes(1);
    expect(await call("code=abc&state=state")).toBe(INVALID);
    expect(mocks.connectCloudflare).toHaveBeenCalledTimes(1);
  });

  it.each(["code=abc", "code=abc&state=other", "code=abc&state=stat"])("should reject \"%s\"", async query => {
    expect(await call(query)).toBe(INVALID);
    expect(mocks.connectCloudflare).not.toHaveBeenCalled();
  });

  it("should reject the browsers that haven't started it", async () => {
    mocks.getSession.mockResolvedValue({});
    expect(await call("code=abc&state=state")).toBe(INVALID);
    expect(mocks.connectCloudflare).not.toHaveBeenCalled();
  });

  it("should reject an authorization that took too long", async () => {
    mocks.getSession.mockResolvedValue(createSession(Date.now() - 1));
    expect(await call("code=abc&state=state")).toBe(INVALID);
    expect(mocks.connectCloudflare).not.toHaveBeenCalled();
  });

  it("should reject the users who are not the admin", async () => {
    mocks.requireAdmin.mockRejectedValue(new Error("403"));
    expect(await call("code=abc&state=state")).toBe("403");
    expect(mocks.connectCloudflare).not.toHaveBeenCalled();
  });

  it("should report a denied consent", async () => {
    expect(await call("error=access_denied&state=state")).toBe("redirect /settings?cloudflare=access_denied");
    expect(mocks.connectCloudflare).not.toHaveBeenCalled();
  });

  it("should not call other errors a denied consent", async () => {
    expect(await call("error=invalid_scope&state=state")).toBe("redirect /settings?cloudflare=failed");
    expect(mocks.connectCloudflare).not.toHaveBeenCalled();
  });

  it("should report a connection that fails", async () => {
    mocks.connectCloudflare.mockRejectedValue(new Error("offline"));
    expect(await call("code=abc&state=state")).toBe("redirect /settings?cloudflare=failed");
    expect(mocks.setUpTunnelAfterConnecting).not.toHaveBeenCalled();
    expect(await call("state=state")).toBe(INVALID);
  });

  it("should report a missing code", async () => {
    expect(await call("state=state")).toBe("redirect /settings?cloudflare=failed");
    expect(mocks.connectCloudflare).not.toHaveBeenCalled();
  });

  describe("with a domain for the dashboard", () => {
    beforeEach(() => {
      mocks.getDashboardDomain.mockResolvedValue("buttler.example.com");
      mocks.getSession.mockResolvedValue({});
    });

    it("should pass the request from localhost to the domain, which has the session", async () => {
      expect(await call("code=a%26b&state=state&other=1"))
        .toBe("redirect https://buttler.example.com/auth/cloudflare?code=a%26b&state=state");
      expect(mocks.connectCloudflare).not.toHaveBeenCalled();
    });

    it("should still connect at localhost if it was started there", async () => {
      mocks.getSession.mockResolvedValue(createSession());
      expect(await call("code=abc&state=state")).toBe("redirect /settings");
    });

    it("should not pass it on from the domain", async () => {
      mocks.getPublicOrigin.mockResolvedValue("https://buttler.example.com");
      expect(await call("code=abc&state=other")).toBe(INVALID);
    });

    it("should not pass it on without a state", async () => {
      expect(await call("code=abc")).toBe(INVALID);
    });
  });
});
