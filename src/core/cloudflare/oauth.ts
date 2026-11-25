import crypto from "node:crypto";
import z from "zod";
import type { CloudflareTokens } from "~/models/cloudflare";
import { CloudflareApiError, CloudflareConnectionError } from "./errors";

/** One client is shared by all instances. It's not a secret, and there is no client secret. */
export const CLOUDFLARE_CLIENT_ID = "da30b553ee59ff299ad39d51e3cdf91f";

/** Registered at Cloudflare, so it must match exactly. The instances don't have a common domain. */
export const CLOUDFLARE_REDIRECT_URI = "http://localhost:7777/auth/cloudflare";

const SCOPES = [
  "zone.read",
  "dns.write",
  "teams-connector-cloudflared.write",
  // Needed for the refresh token
  "offline_access",
];

const OAUTH_URL = "https://dash.cloudflare.com/oauth2";
const TIMEOUT = 30_000;

const TokenResponse = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  expires_in: z.number(),
});

const ErrorResponse = z.object({ error: z.string() });

export type CloudflareAuthorization = {
  url: string,
  state: string,
  verifier: string,
};

function createRandomString() {
  return crypto.randomBytes(32).toString("base64url");
}

/** The state and the verifier belong to the browser that opens the URL */
export function createAuthorization(): CloudflareAuthorization {
  const state = createRandomString();
  const verifier = createRandomString();
  const url = new URL(`${OAUTH_URL}/auth`);
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: CLOUDFLARE_CLIENT_ID,
    redirect_uri: CLOUDFLARE_REDIRECT_URI,
    scope: SCOPES.join(" "),
    state,
    code_challenge: crypto.createHash("sha256").update(verifier).digest("base64url"),
    code_challenge_method: "S256",
  }).toString();
  return { url: url.toString(), state, verifier };
}

async function post(endpoint: string, params: Record<string, string>) {
  return await fetch(`${OAUTH_URL}/${endpoint}`, {
    method: "POST",
    body: new URLSearchParams({ client_id: CLOUDFLARE_CLIENT_ID, ...params }),
    signal: AbortSignal.timeout(TIMEOUT),
  });
}

// The responses have the tokens, so they must not be a part of the errors
async function requestTokens(params: Record<string, string>): Promise<CloudflareTokens> {
  const response = await post("token", params);
  const content: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const { data } = ErrorResponse.safeParse(content);
    if (data?.error === "invalid_grant") {
      throw new CloudflareConnectionError("Cloudflare doesn't accept the credentials");
    }
    throw new CloudflareApiError(`Cloudflare rejected the token request (${data?.error ?? "unknown error"})`, response.status);
  }
  const { data } = TokenResponse.safeParse(content);
  if (!data) throw new CloudflareApiError("Cloudflare returned an unknown token response", response.status);
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + (data.expires_in * 1000),
  };
}

export function exchangeCode(code: string, verifier: string) {
  return requestTokens({
    grant_type: "authorization_code",
    code,
    code_verifier: verifier,
    redirect_uri: CLOUDFLARE_REDIRECT_URI,
  });
}

/** Replaces both of the tokens, the previous ones stop working right away */
export function refreshTokens(refreshToken: string) {
  return requestTokens({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
}

async function revokeToken(token: string) {
  const response = await post("revoke", { token });
  if (!response.ok) throw new CloudflareApiError("Cloudflare couldn't revoke the token", response.status);
}

export async function revokeTokens({ accessToken, refreshToken }: CloudflareTokens) {
  await revokeToken(refreshToken);
  await revokeToken(accessToken);
}
