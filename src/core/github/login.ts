import crypto from "node:crypto";
import { getUser } from "./users";

/** The GitHub login that this browser has started */
export type PendingGitHubLogin = {
  state: string,
  /** Timestamp in milliseconds */
  expiresAt: number,
};

const LOGIN_LIFETIME = 10 * 60 * 1000;

export function createGitHubLogin(): PendingGitHubLogin {
  return {
    state: crypto.randomBytes(32).toString("base64url"),
    expiresAt: Date.now() + LOGIN_LIFETIME,
  };
}

export function getAuthorizeUrl(clientId: string, redirectUri: string, state: string) {
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", "read:user");
  url.searchParams.set("state", state);
  return url.toString();
}

type TokenResponse = {
  access_token?: string,
  error?: string,
  error_description?: string,
};

export type GitHubLogin = {
  token: string,
  user: Awaited<ReturnType<typeof getUser>>,
};

/** Exchanges the code of the callback for a token, an expired or invalid code is an error */
export async function exchangeLoginCode(
  clientId: string,
  clientSecret: string,
  code: string,
  redirectUri: string,
): Promise<GitHubLogin> {
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  // GitHub answers an invalid code with 200 and an error in the body
  const data = await response.json() as TokenResponse;
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description ?? data.error ?? `GitHub answered with ${response.status}`);
  }
  return {
    token: data.access_token,
    user: await getUser(data.access_token),
  };
}
