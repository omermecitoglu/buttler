import { beforeEach, describe, expect, it, vi } from "vitest";
import { connectCloudflareAction, disconnectCloudflareAction } from "./cloudflare";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getAccess: vi.fn(),
  disconnectCloudflare: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ refresh: mocks.refresh }));
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

describe("Cloudflare actions", () => {
  const session: Record<string, unknown> = {};

  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    Object.assign(session, { userId: 1, cloudflare: undefined, save: vi.fn() });
    mocks.getSession.mockResolvedValue(session);
    mocks.getAccess.mockResolvedValue("admin");
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

  it("should report that it can't be disconnected", async () => {
    mocks.disconnectCloudflare.mockRejectedValue(new Error("offline"));
    expect(await disconnectCloudflareAction({}, new FormData())).toEqual({ "[error]": "disconnect_failed" });
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("should reject the users who are not the admin", async () => {
    mocks.getAccess.mockResolvedValue("member");
    await expect(connectCloudflareAction({}, new FormData())).rejects.toThrow("403");
    await expect(disconnectCloudflareAction({}, new FormData())).rejects.toThrow("403");
    expect(session.cloudflare).toBeUndefined();
    expect(mocks.disconnectCloudflare).not.toHaveBeenCalled();
  });
});
