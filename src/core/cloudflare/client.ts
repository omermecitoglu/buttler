import "server-only";
import { getAccessToken } from "./connection";
import { CloudflareApiError } from "./errors";

const API_URL = "https://api.cloudflare.com/client/v4";
const TIMEOUT = 30_000;

type CloudflareResponse<T> = {
  result: T,
  result_info?: { page: number, total_pages: number },
};

type CloudflareErrorResponse = {
  errors?: { code: number, message: string }[],
};

async function send(path: string, accessToken: string, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  if (init?.body) headers.set("Content-Type", "application/json");
  return await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    signal: AbortSignal.timeout(TIMEOUT),
  });
}

export async function cloudflareFetch<T>(path: string, init?: RequestInit): Promise<CloudflareResponse<T>> {
  const accessToken = await getAccessToken();
  let response = await send(path, accessToken, init);
  // Tokens that were revoked or replaced are rejected with a 403, the same as a missing permission
  if (response.status === 401 || response.status === 403) {
    response = await send(path, await getAccessToken(accessToken), init);
  }
  if (!response.ok) {
    const content = await response.json().catch(() => null) as CloudflareErrorResponse | null;
    const reasons = content?.errors?.map(({ code, message }) => `${message} (${code})`).join(", ");
    throw new CloudflareApiError(reasons || `The Cloudflare API responded with status ${response.status}`, response.status);
  }
  return await response.json() as CloudflareResponse<T>;
}
