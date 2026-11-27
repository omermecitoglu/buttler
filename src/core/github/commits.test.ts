import { afterEach, describe, expect, it, vi } from "vitest";
import * as client from "./client";
import { compareCommits, getCommit } from "./commits";

const rawCommit = {
  sha: "f81cda3b9e2c4d5a6f7e8d9c0b1a2f3e4d5c6b7a",
  html_url: "https://github.com/owner/repo/commit/f81cda3b9e2c4d5a6f7e8d9c0b1a2f3e4d5c6b7a",
  commit: {
    message: "fix: send the auth header\n\nThe header was missing in /v1/users",
    author: { name: "Octocat", date: "2026-11-20T10:00:00Z" },
  },
};

const formattedCommit = {
  hash: rawCommit.sha,
  shortHash: "f81cda3",
  message: "fix: send the auth header",
  author: "Octocat",
  date: "2026-11-20T10:00:00Z",
  url: rawCommit.html_url,
};

function mockFetch(data: unknown) {
  return vi.spyOn(client, "githubFetch").mockResolvedValue({ data, headers: new Headers(), status: 200 });
}

describe("compareCommits", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the commits between the base and the head", async () => {
    const spy = mockFetch({ total_commits: 1, commits: [rawCommit] });
    const result = await compareCommits("token", "owner", "repo", "a237ee0", "f81cda3");
    expect(spy).toHaveBeenCalledWith("/repos/owner/repo/compare/a237ee0...f81cda3", "token");
    expect(result).toEqual({ commits: [formattedCommit], total: 1 });
  });

  it("keeps the total when GitHub lists fewer commits", async () => {
    mockFetch({ total_commits: 300, commits: [rawCommit] });
    const result = await compareCommits(null, "owner", "repo", "a", "b");
    expect(result.total).toBe(300);
    expect(result.commits).toHaveLength(1);
  });
});

describe("getCommit", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a single commit", async () => {
    const spy = mockFetch(rawCommit);
    const result = await getCommit("token", "owner", "repo", rawCommit.sha);
    expect(spy).toHaveBeenCalledWith(`/repos/owner/repo/commits/${rawCommit.sha}`, "token");
    expect(result).toEqual(formattedCommit);
  });

  it("handles a commit without an author", async () => {
    mockFetch({ ...rawCommit, commit: { ...rawCommit.commit, author: null } });
    const result = await getCommit(null, "owner", "repo", rawCommit.sha);
    expect(result.author).toBeNull();
    expect(result.date).toBeNull();
  });
});
