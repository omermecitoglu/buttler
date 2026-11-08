import { afterEach, describe, expect, it, vi } from "vitest";
import { githubFetch } from "./client";
import {
  type GitHubApiError,
  GitHubAuthError,
  GitHubRateLimitError,
  isGitHubApiError,
  isGitHubAuthError,
  isGitHubRateLimitError,
} from "./errors";

describe("githubFetch", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should send default headers and return parsed data", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: () => Promise.resolve({ id: 123 }),
    } as Response);

    const result = await githubFetch<{ id: number }>("/user", "fake-token");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.github.com/user",
      expect.objectContaining({
        headers: expect.any(Headers),
      }),
    );

    const callHeaders = fetchMock.mock.calls[0][1]?.headers as Headers;
    expect(callHeaders.get("Authorization")).toBe("Bearer fake-token");
    expect(callHeaders.get("Accept")).toBe("application/vnd.github+json");
    expect(callHeaders.get("X-GitHub-Api-Version")).toBe("2022-11-28");
    expect(result.data).toEqual({ id: 123 });
  });

  it("should support absolute URLs", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: () => Promise.resolve({ ok: true }),
    } as Response);

    await githubFetch<{ ok: boolean }>("https://api.github.com/custom/path", "fake-token");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.github.com/custom/path",
      expect.anything(),
    );
  });

  it("should throw GitHubAuthError on 401", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 401,
      headers: new Headers(),
      json: () => Promise.resolve({ message: "Bad credentials" }),
    } as Response);

    await expect(githubFetch("/user", "invalid-token")).rejects.toThrow(GitHubAuthError);
    try {
      await githubFetch("/user", "invalid-token");
    } catch (error) {
      expect(isGitHubAuthError(error)).toBe(true);
      expect((error as GitHubAuthError).message).toBe("Bad credentials");
      expect((error as GitHubAuthError).status).toBe(401);
    }
  });

  it("should throw GitHubRateLimitError on 429", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 429,
      headers: new Headers({
        "retry-after": "60",
      }),
      json: () => Promise.resolve({ message: "Too many requests" }),
    } as Response);

    try {
      await githubFetch("/user", "fake-token");
      expect.unreachable("Should have thrown");
    } catch (error) {
      expect(isGitHubRateLimitError(error)).toBe(true);
      const rateLimitError = error as GitHubRateLimitError;
      expect(rateLimitError.status).toBe(429);
      expect(rateLimitError.retryAfter).toBe(60);
      expect(rateLimitError.resetAt).toBeInstanceOf(Date);
    }
  });

  it("should throw GitHubRateLimitError on 403 when remaining is 0", async () => {
    const resetTime = Math.floor(Date.now() / 1000) + 300;
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 403,
      headers: new Headers({
        "x-ratelimit-remaining": "0",
        "x-ratelimit-limit": "5000",
        "x-ratelimit-reset": String(resetTime),
      }),
      json: () => Promise.resolve({ message: "API rate limit exceeded for user ID 123." }),
    } as Response);

    try {
      await githubFetch("/user", "fake-token");
      expect.unreachable("Should have thrown");
    } catch (error) {
      expect(isGitHubRateLimitError(error)).toBe(true);
      const rateLimitError = error as GitHubRateLimitError;
      expect(rateLimitError.status).toBe(403);
      expect(rateLimitError.remaining).toBe(0);
      expect(rateLimitError.limit).toBe(5000);
      expect(rateLimitError.resetAt?.getTime()).toBe(resetTime * 1000);
    }
  });

  it("should throw GitHubRateLimitError on 403 when error message mentions rate limit", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 403,
      headers: new Headers(),
      json: () => Promise.resolve({ message: "You have exceeded a secondary rate limit." }),
    } as Response);

    await expect(githubFetch("/user", "fake-token")).rejects.toThrow(GitHubRateLimitError);
  });

  it("should throw GitHubApiError on other error statuses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 500,
      headers: new Headers(),
      json: () => Promise.resolve({ message: "Internal server error" }),
    } as Response);

    try {
      await githubFetch("/user", "fake-token");
      expect.unreachable("Should have thrown");
    } catch (error) {
      expect(isGitHubApiError(error)).toBe(true);
      const apiError = error as GitHubApiError;
      expect(apiError.status).toBe(500);
      expect(apiError.message).toBe("Internal server error");
      expect(apiError.data).toEqual({ message: "Internal server error" });
    }
  });
});
