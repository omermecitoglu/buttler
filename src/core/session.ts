import "server-only";
import crypto from "node:crypto";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { getPublicOrigin, isLoopbackOrigin } from "./headers";
import { getSetting, setSetting } from "./settings";
import type { PendingGitHubLogin } from "./github/login";

export type SessionUser = {
  login: string,
  name: string | null,
  avatar: string,
};

/** The Cloudflare authorization that this browser has started */
export type PendingCloudflareAuthorization = {
  state: string,
  verifier: string,
  /** Timestamp in milliseconds */
  expiresAt: number,
};

type SessionData = {
  userId?: number,
  /** Missing in the sessions that were created before it was introduced */
  user?: SessionUser,
  githubToken?: string,
  cloudflare?: PendingCloudflareAuthorization,
  githubLogin?: PendingGitHubLogin,
  /** The code of the setup link that was opened in this browser */
  setupCode?: string,
};

const SESSION_COOKIE_NAME = "buttler_session";
const SESSION_PASSWORD_SETTING_KEY = "session_password";

async function getOrCreateSessionPassword(): Promise<string> {
  const existing = await getSetting(SESSION_PASSWORD_SETTING_KEY);
  if (existing) {
    return existing;
  }
  const generated = crypto.randomBytes(32).toString("hex");
  await setSetting(SESSION_PASSWORD_SETTING_KEY, generated);
  return generated;
}

export async function getSession() {
  const [
    password,
    origin,
  ] = await Promise.all([
    getOrCreateSessionPassword(),
    // Without a host header the origin is unknown, and the cookie stays secure
    getPublicOrigin().catch(() => ""),
  ]);
  return await getIronSession<SessionData>(await cookies(), {
    cookieName: SESSION_COOKIE_NAME,
    password,
    cookieOptions: {
      // Safari rejects secure cookies without HTTPS, also at localhost
      secure: process.env.NODE_ENV === "production" && !isLoopbackOrigin(origin),
    },
  });
}
