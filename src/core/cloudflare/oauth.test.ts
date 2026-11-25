import crypto from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CLOUDFLARE_CLIENT_ID,
  CLOUDFLARE_REDIRECT_URI,
  createAuthorization,
  exchangeCode,
  refreshTokens,
  revokeTokens,
} from "./oauth";

const fetchMock = vi.fn<typeof fetch>();

function getRequest(index = 0) {
  const [url, init] = fetchMock.mock.calls[index];
  return { url, params: Object.fromEntries(init?.body as URLSearchParams) };
}

describe("Cloudflare OAuth", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    vi.useFakeTimers({ now: 1_000_000 });
    fetchMock.mockReset();
    fetchMock.mockImplementation(() => Promise.resolve(Response.json({
      access_token: "access",
      refresh_token: "refresh",
      expires_in: 3600,
    })));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("should create a new authorization with PKCE every time", () => {
    const { url, state, verifier } = createAuthorization();
    const { origin, pathname, searchParams } = new URL(url);
    expect(origin + pathname).toBe("https://dash.cloudflare.com/oauth2/auth");
    expect(Object.fromEntries(searchParams)).toEqual({
      response_type: "code",
      client_id: CLOUDFLARE_CLIENT_ID,
      redirect_uri: CLOUDFLARE_REDIRECT_URI,
      scope: "zone.read dns.write teams-connector-cloudflared.write offline_access",
      state,
      code_challenge: crypto.createHash("sha256").update(verifier).digest("base64url"),
      code_challenge_method: "S256",
    });
    expect(url).not.toContain(verifier);
    const other = createAuthorization();
    expect(other.state).not.toBe(state);
    expect(other.verifier).not.toBe(verifier);
  });

  it("should exchange the code without a secret", async () => {
    expect(await exchangeCode("code", "verifier")).toEqual({
      accessToken: "access",
      refreshToken: "refresh",
      expiresAt: 1_000_000 + 3_600_000,
    });
    expect(getRequest()).toEqual({
      url: "https://dash.cloudflare.com/oauth2/token",
      params: {
        client_id: CLOUDFLARE_CLIENT_ID,
        grant_type: "authorization_code",
        code: "code",
        code_verifier: "verifier",
        redirect_uri: CLOUDFLARE_REDIRECT_URI,
      },
    });
  });

  it("should refresh the tokens", async () => {
    await refreshTokens("old");
    expect(getRequest().params).toEqual({
      client_id: CLOUDFLARE_CLIENT_ID,
      grant_type: "refresh_token",
      refresh_token: "old",
    });
  });

  it("should tell rejected credentials from other failures", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ error: "invalid_grant" }, { status: 400 }));
    await expect(refreshTokens("old")).rejects.toMatchObject({ name: "CloudflareConnectionError" });
    fetchMock.mockResolvedValueOnce(Response.json({ error: "server_error" }, { status: 500 }));
    await expect(refreshTokens("old")).rejects.toMatchObject({ name: "CloudflareApiError", status: 500 });
    fetchMock.mockResolvedValueOnce(new Response("<html>", { status: 502 }));
    await expect(refreshTokens("old")).rejects.toMatchObject({ name: "CloudflareApiError", status: 502 });
  });

  it("should reject unknown responses without showing the tokens", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ access_token: "secret-access" }));
    const error = await exchangeCode("code", "verifier").catch((reason: unknown) => reason);
    expect(error).toMatchObject({ name: "CloudflareApiError" });
    expect(String(error)).not.toContain("secret-access");
  });

  it("should revoke both of the tokens", async () => {
    fetchMock.mockImplementation(() => Promise.resolve(new Response(null)));
    await revokeTokens({ accessToken: "access", refreshToken: "refresh", expiresAt: 0 });
    expect([getRequest(0), getRequest(1)].map(({ params }) => params.token)).toEqual(["refresh", "access"]);
  });

  it("should report the tokens that can't be revoked", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 503 }));
    await expect(revokeTokens({ accessToken: "access", refreshToken: "refresh", expiresAt: 0 })).rejects.toThrow("revoke");
  });
});
