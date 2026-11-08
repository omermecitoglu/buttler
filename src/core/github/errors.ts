export class GitHubError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GitHubError";
  }
}

export class GitHubAuthError extends GitHubError {
  readonly status = 401;

  constructor(message = "GitHub authentication failed: Bad credentials or expired token.") {
    super(message);
    this.name = "GitHubAuthError";
  }
}

export type GitHubRateLimitErrorOptions = {
  status?: number,
  limit?: number,
  remaining?: number,
  resetAt?: Date,
  retryAfter?: number,
};

export class GitHubRateLimitError extends GitHubError {
  readonly status: number;
  readonly limit?: number;
  readonly remaining?: number;
  readonly resetAt?: Date;
  readonly retryAfter?: number;

  constructor(
    message = "GitHub API rate limit exceeded.",
    options: GitHubRateLimitErrorOptions = {},
  ) {
    super(message);
    this.name = "GitHubRateLimitError";
    this.status = options.status ?? 403;
    this.limit = options.limit;
    this.remaining = options.remaining;
    this.resetAt = options.resetAt;
    this.retryAfter = options.retryAfter;
  }
}

export class GitHubApiError extends GitHubError {
  readonly status: number;
  readonly data?: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "GitHubApiError";
    this.status = status;
    this.data = data;
  }
}

export function isGitHubAuthError(error: unknown): error is GitHubAuthError {
  return error instanceof GitHubAuthError || (error instanceof Error && error.name === "GitHubAuthError");
}

export function isGitHubRateLimitError(error: unknown): error is GitHubRateLimitError {
  return error instanceof GitHubRateLimitError || (error instanceof Error && error.name === "GitHubRateLimitError");
}

export function isGitHubApiError(error: unknown): error is GitHubApiError {
  return error instanceof GitHubApiError || (error instanceof Error && error.name === "GitHubApiError");
}
