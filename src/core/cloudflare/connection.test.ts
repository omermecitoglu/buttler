import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CloudflareTokens } from "~/models/cloudflare";
import type { CloudflareConnection } from "~/operations/getCloudflareConnection";
import { connectCloudflare, disconnectCloudflare, getAccessToken, getConnectionState } from "./connection";
import { CloudflareConnectionError } from "./errors";

const mocks = vi.hoisted(() => ({
  exchangeCode: vi.fn(),
  refreshTokens: vi.fn(),
  revokeTokens: vi.fn(),
}));

let saved: CloudflareConnection = { state: "disconnected" };

vi.mock("server-only", () => ({}));
vi.mock("~/database", () => ({ default: {} }));
vi.mock("./oauth", () => mocks);
vi.mock("~/operations/getCloudflareConnection", () => ({ default: () => Promise.resolve(saved) }));
vi.mock("~/operations/saveCloudflareConnection", () => ({
  default: (_db: unknown, tokens: CloudflareTokens | null) => {
    saved = tokens ? { state: "connected", tokens } : { state: "lost" };
    return Promise.resolve();
  },
}));
vi.mock("~/operations/deleteCloudflareConnection", () => ({
  default: () => {
    saved = { state: "disconnected" };
    return Promise.resolve();
  },
}));

function createTokens(name: string, lifetime = 3_600_000): CloudflareTokens {
  return { accessToken: `access-${name}`, refreshToken: `refresh-${name}`, expiresAt: Date.now() + lifetime };
}

describe("Cloudflare connection", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    saved = { state: "connected", tokens: createTokens("old") };
    mocks.refreshTokens.mockImplementation(() => Promise.resolve(createTokens("new")));
    mocks.exchangeCode.mockImplementation(() => Promise.resolve(createTokens("new")));
  });

  it("should use the token until it expires", async () => {
    expect(await getAccessToken()).toBe("access-old");
    expect(mocks.refreshTokens).not.toHaveBeenCalled();
  });

  it("should refresh the token before it expires", async () => {
    saved = { state: "connected", tokens: createTokens("old", 30_000) };
    expect(await getAccessToken()).toBe("access-new");
    expect(mocks.refreshTokens).toHaveBeenCalledWith("refresh-old");
    expect(saved).toMatchObject({ tokens: { refreshToken: "refresh-new" } });
  });

  it("should only refresh once for simultaneous requests", async () => {
    saved = { state: "connected", tokens: createTokens("old", -1) };
    const tokens = await Promise.all([getAccessToken(), getAccessToken(), getAccessToken()]);
    expect(tokens).toEqual(["access-new", "access-new", "access-new"]);
    expect(mocks.refreshTokens).toHaveBeenCalledTimes(1);
  });

  it("should refresh a rejected token, unless that has already happened", async () => {
    const tokens = await Promise.all([getAccessToken("access-old"), getAccessToken("access-old")]);
    expect(tokens).toEqual(["access-new", "access-new"]);
    expect(mocks.refreshTokens).toHaveBeenCalledTimes(1);
  });

  it("should remember that the connection is lost", async () => {
    saved = { state: "connected", tokens: createTokens("old", -1) };
    mocks.refreshTokens.mockRejectedValue(new CloudflareConnectionError());
    await expect(getAccessToken()).rejects.toThrow(CloudflareConnectionError);
    expect(await getConnectionState()).toBe("lost");
    await expect(getAccessToken()).rejects.toThrow(CloudflareConnectionError);
    expect(mocks.refreshTokens).toHaveBeenCalledTimes(1);
  });

  it("should keep the connection if Cloudflare can't be reached", async () => {
    saved = { state: "connected", tokens: createTokens("old", -1) };
    mocks.refreshTokens.mockRejectedValueOnce(new TypeError("fetch failed"));
    await expect(getAccessToken()).rejects.toThrow("fetch failed");
    expect(await getAccessToken()).toBe("access-new");
  });

  it("should not have a token without a connection", async () => {
    saved = { state: "disconnected" };
    await expect(getAccessToken()).rejects.toThrow(CloudflareConnectionError);
  });

  it("should connect", async () => {
    saved = { state: "disconnected" };
    await connectCloudflare("code", "verifier");
    expect(mocks.exchangeCode).toHaveBeenCalledWith("code", "verifier");
    expect(saved).toMatchObject({ state: "connected", tokens: { accessToken: "access-new" } });
    expect(mocks.revokeTokens).not.toHaveBeenCalled();
  });

  it("should revoke the connection that is replaced", async () => {
    mocks.revokeTokens.mockRejectedValue(new Error("offline"));
    await connectCloudflare("code", "verifier");
    expect(mocks.revokeTokens).toHaveBeenCalledWith(expect.objectContaining({ accessToken: "access-old" }));
    expect(saved).toMatchObject({ tokens: { accessToken: "access-new" } });
  });

  it("should keep the previous connection if the code is rejected", async () => {
    mocks.exchangeCode.mockRejectedValue(new CloudflareConnectionError());
    await expect(connectCloudflare("code", "verifier")).rejects.toThrow();
    expect(saved).toMatchObject({ tokens: { accessToken: "access-old" } });
  });

  it("should revoke the tokens before they are removed", async () => {
    mocks.revokeTokens.mockImplementation(() => {
      expect(saved.state).toBe("connected");
      return Promise.resolve();
    });
    await disconnectCloudflare();
    expect(mocks.revokeTokens).toHaveBeenCalledTimes(1);
    expect(saved).toEqual({ state: "disconnected" });
  });

  it("should stay connected if the tokens can't be revoked", async () => {
    mocks.revokeTokens.mockRejectedValue(new Error("offline"));
    await expect(disconnectCloudflare()).rejects.toThrow("offline");
    expect(saved.state).toBe("connected");
  });

  it("should remove a lost connection without Cloudflare", async () => {
    saved = { state: "lost" };
    await disconnectCloudflare();
    expect(mocks.revokeTokens).not.toHaveBeenCalled();
    expect(saved).toEqual({ state: "disconnected" });
  });
});
