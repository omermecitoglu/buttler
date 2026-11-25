import crypto from "node:crypto";
import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "~/core/auth";
import { connectCloudflare } from "~/core/cloudflare/connection";
import { setUpTunnelAfterConnecting } from "~/core/cloudflare/tunnel";
import { getPublicOrigin } from "~/core/headers";
import { getSession } from "~/core/session";
import db from "~/database";
import getDashboardDomain from "~/operations/getDashboardDomain";

const LOOPBACK_HOSTNAMES = ["localhost", "127.0.0.1", "[::1]"];
const CALLBACK_PARAMS = ["code", "state", "error"];

function isEqual(a: string, b: string) {
  const [
    first,
    second,
  ] = [Buffer.from(a), Buffer.from(b)];
  return first.length === second.length && crypto.timingSafeEqual(first, second);
}

/**
 * Cloudflare always returns to localhost, which doesn't have the session of the dashboard domain.
 * Returns the address that the request can be passed to, the state is verified there.
 */
async function getRelayUrl(request: Request, searchParams: URLSearchParams) {
  const { hostname } = new URL(await getPublicOrigin(request.headers));
  if (!LOOPBACK_HOSTNAMES.includes(hostname)) return null;
  const dashboardDomain = await getDashboardDomain(db);
  if (!dashboardDomain) return null;
  const url = new URL(`https://${dashboardDomain}/auth/cloudflare`);
  for (const name of CALLBACK_PARAMS) {
    const value = searchParams.get(name);
    if (value !== null) url.searchParams.set(name, value);
  }
  return url.toString();
}

async function completeAuthorization(code: string, verifier: string) {
  try {
    await connectCloudflare(code, verifier);
    return true;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to connect Cloudflare:", error);
    return false;
  }
}

/** The connection is kept if it fails, the tunnel can be set up in the settings */
async function setUpTunnel() {
  try {
    await setUpTunnelAfterConnecting();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to set up the Cloudflare tunnel:", error);
  }
  revalidateTag("getAllServices()", { expire: 0 });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const state = searchParams.get("state");
  const session = await getSession();
  const pending = session.cloudflare;

  if (!state || !pending || !isEqual(state, pending.state)) {
    const relayUrl = state ? await getRelayUrl(request, searchParams) : null;
    return redirect(relayUrl ?? "/settings?cloudflare=invalid_state");
  }

  await requireAdmin();

  // It can only be used once
  delete session.cloudflare;
  await session.save();

  if (pending.expiresAt < Date.now()) return redirect("/settings?cloudflare=invalid_state");
  const error = searchParams.get("error");
  if (error !== null) return redirect(`/settings?cloudflare=${error === "access_denied" ? "access_denied" : "failed"}`);

  const code = searchParams.get("code");
  const isConnected = code !== null && await completeAuthorization(code, pending.verifier);
  if (isConnected) await setUpTunnel();
  // The code must not stay in the address bar
  return redirect(isConnected ? "/settings" : "/settings?cloudflare=failed");
}
