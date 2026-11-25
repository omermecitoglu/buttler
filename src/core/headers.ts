import "server-only";
import { headers as nextHeaders } from "next/headers";

const LOOPBACK_HOSTNAMES = ["localhost", "127.0.0.1", "[::1]"];

/** Whether the browser is on the computer that Buttler runs on */
export function isLoopbackOrigin(origin: string) {
  return URL.canParse(origin) && LOOPBACK_HOSTNAMES.includes(new URL(origin).hostname);
}

export async function getPublicOrigin(headers?: Headers) {
  headers = headers ?? await nextHeaders();
  const xForwardedProto = headers.get("x-forwarded-proto");
  const xForwardedHost = headers.get("x-forwarded-host");
  const url = new URL(`${xForwardedProto}://${xForwardedHost}`);
  return url.origin;
}
