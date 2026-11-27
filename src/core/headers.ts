import "server-only";

/** Falls back to the host header, and to https without x-forwarded-proto */
export { getPublicOrigin } from "@omer-x/next-utils";

const LOOPBACK_HOSTNAMES = ["localhost", "127.0.0.1", "[::1]"];

/** Whether the browser is on the computer that Buttler runs on */
export function isLoopbackOrigin(origin: string) {
  return URL.canParse(origin) && LOOPBACK_HOSTNAMES.includes(new URL(origin).hostname);
}
