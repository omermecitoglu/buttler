import { GitHubApiError, GitHubAuthError, GitHubRateLimitError } from "./errors";

const GITHUB_API_BASE_URL = "https://api.github.com";

export type GitHubFetchResponse<T> = {
  data: T,
  headers: Headers,
  status: number,
};

export async function githubFetch<T>(
  endpoint: string,
  accessToken: string,
  init?: RequestInit,
): Promise<GitHubFetchResponse<T>> {
  const url = endpoint.startsWith("http")
    ? endpoint
    : `${GITHUB_API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  headers.set("Accept", "application/vnd.github+json");
  if (!headers.has("X-GitHub-Api-Version")) {
    headers.set("X-GitHub-Api-Version", "2022-11-28");
  }

  const response = await fetch(url, {
    ...init,
    headers,
  });

  const remaining = response.headers.get("x-ratelimit-remaining");
  const reset = response.headers.get("x-ratelimit-reset");
  const limit = response.headers.get("x-ratelimit-limit");
  const retryAfter = response.headers.get("retry-after");

  if (!response.ok) {
    let errorData: { message?: string } | null = null;
    try {
      errorData = await response.json();
    } catch {
      // response body might not be JSON
    }
    const errorMessage = errorData?.message;

    if (response.status === 401) {
      throw new GitHubAuthError(errorMessage || "GitHub authentication failed: Bad credentials or expired token.");
    }

    const isRateLimited =
      response.status === 429 ||
      (response.status === 403 && (remaining === "0" || Boolean(errorMessage?.toLowerCase().includes("rate limit"))));

    if (isRateLimited) {
      const resetTimestamp = reset ? parseInt(reset, 10) * 1000 : undefined;
      const retryAfterSeconds = retryAfter ? parseInt(retryAfter, 10) : undefined;
      const resetAt = resetTimestamp
        ? new Date(resetTimestamp)
        : retryAfterSeconds
          ? new Date(Date.now() + (retryAfterSeconds * 1000))
          : undefined;

      throw new GitHubRateLimitError(
        errorMessage || "GitHub API rate limit exceeded.",
        {
          status: response.status,
          limit: limit ? parseInt(limit, 10) : undefined,
          remaining: remaining ? parseInt(remaining, 10) : 0,
          resetAt,
          retryAfter: retryAfterSeconds,
        },
      );
    }

    throw new GitHubApiError(
      errorMessage || `GitHub API request failed with status ${response.status}`,
      response.status,
      errorData,
    );
  }

  const data = (await response.json()) as T;
  return {
    data,
    headers: response.headers,
    status: response.status,
  };
}
