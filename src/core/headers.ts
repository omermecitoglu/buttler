import "server-only";
import { headers as nextHeaders } from "next/headers";

export async function getPublicOrigin(headers?: Headers) {
  headers = headers ?? await nextHeaders();
  const xForwardedProto = headers.get("x-forwarded-proto");
  const xForwardedHost = headers.get("x-forwarded-host");
  const url = new URL(`${xForwardedProto}://${xForwardedHost}`);
  return url.origin;
}
