import "server-only";
import { createQueue } from "~/core/queue";
import db from "~/database";
import type { CloudflareTokens } from "~/models/cloudflare";
import deleteCloudflareConnection from "~/operations/deleteCloudflareConnection";
import getCloudflareConnection from "~/operations/getCloudflareConnection";
import saveCloudflareConnection from "~/operations/saveCloudflareConnection";
import { CloudflareConnectionError, isCloudflareConnectionError } from "./errors";
import { exchangeCode, refreshTokens, revokeTokens } from "./oauth";

/** Tokens are refreshed a little earlier, so they don't expire on the way */
const EXPIRY_MARGIN = 60_000;

/** A refresh invalidates the tokens that others are about to use, so nothing overlaps */
const enqueue = createQueue("cloudflare-connection-queue");

async function refreshConnection({ refreshToken }: CloudflareTokens) {
  try {
    const tokens = await refreshTokens(refreshToken);
    // The old tokens don't work anymore, so the new ones are saved before they are used
    await saveCloudflareConnection(db, tokens);
    return tokens;
  } catch (error) {
    if (isCloudflareConnectionError(error)) await saveCloudflareConnection(db, null);
    throw error;
  }
}

/**
 * Returns an access token that hasn't expired.
 * @param rejectedToken - A token that Cloudflare didn't accept. It's refreshed, unless that has already happened.
 */
export function getAccessToken(rejectedToken?: string): Promise<string> {
  return enqueue(async () => {
    const connection = await getCloudflareConnection(db);
    if (connection.state !== "connected") throw new CloudflareConnectionError();
    const { tokens } = connection;
    const isUsable = tokens.accessToken !== rejectedToken && tokens.expiresAt - EXPIRY_MARGIN > Date.now();
    if (isUsable) return tokens.accessToken;
    const { accessToken } = await refreshConnection(tokens);
    return accessToken;
  });
}

/** The state of the connection, without the tokens */
export async function getConnectionState() {
  const { state } = await getCloudflareConnection(db);
  return state;
}

/** Completes the authorization. It doesn't check who may connect, the caller must do that. */
export function connectCloudflare(code: string, verifier: string): Promise<void> {
  return enqueue(async () => {
    const tokens = await exchangeCode(code, verifier);
    const previous = await getCloudflareConnection(db);
    await saveCloudflareConnection(db, tokens);
    if (previous.state !== "connected") return;
    await revokeTokens(previous.tokens).catch((error: unknown) => {
      // eslint-disable-next-line no-console
      console.error("Failed to revoke the previous Cloudflare connection:", error);
    });
  });
}

/** The connection is kept if the tokens can't be revoked, so it can be tried again */
export function disconnectCloudflare(): Promise<void> {
  return enqueue(async () => {
    const connection = await getCloudflareConnection(db);
    if (connection.state === "connected") await revokeTokens(connection.tokens);
    await deleteCloudflareConnection(db);
  });
}
