import { afterEach, describe, expect, it, vi } from "vitest";
import * as client from "./client";
import { getRepos, getRepositories, getUserRepositories } from "./repos";

const mockRawRepo1 = {
  id: 101,
  name: "buttler",
  full_name: "omermecitoglu/buttler",
  owner: {
    id: 1,
    login: "omermecitoglu",
    avatar_url: "https://github.com/omermecitoglu.png",
    html_url: "https://github.com/omermecitoglu",
    type: "User",
  },
  private: false,
  html_url: "https://github.com/omermecitoglu/buttler",
  description: "Self-hosted CI/CD dashboard",
  fork: false,
  url: "https://api.github.com/repos/omermecitoglu/buttler",
  clone_url: "https://github.com/omermecitoglu/buttler.git",
  ssh_url: "git@github.com:omermecitoglu/buttler.git",
  default_branch: "alpha",
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-02-01T00:00:00Z",
  pushed_at: "2024-02-01T12:00:00Z",
  language: "TypeScript",
  archived: false,
  disabled: false,
  visibility: "public",
  open_issues_count: 5,
  stargazers_count: 10,
  forks_count: 2,
};

const mockRawRepo2 = {
  id: 102,
  name: "tailwind-ui-kit",
  full_name: "omermecitoglu/tailwind-ui-kit",
  owner: {
    id: 1,
    login: "omermecitoglu",
    avatar_url: "https://github.com/omermecitoglu.png",
    html_url: "https://github.com/omermecitoglu",
    type: "User",
  },
  private: true,
  html_url: "https://github.com/omermecitoglu/tailwind-ui-kit",
  description: "UI kit components",
  fork: false,
  url: "https://api.github.com/repos/omermecitoglu/tailwind-ui-kit",
  clone_url: "https://github.com/omermecitoglu/tailwind-ui-kit.git",
  ssh_url: "git@github.com:omermecitoglu/tailwind-ui-kit.git",
  default_branch: "main",
  created_at: "2024-01-05T00:00:00Z",
  updated_at: "2024-02-03T00:00:00Z",
  pushed_at: "2024-02-03T12:00:00Z",
  language: "TypeScript",
  archived: false,
  disabled: false,
  visibility: "private",
  open_issues_count: 2,
  stargazers_count: 5,
  forks_count: 0,
};

describe("getRepositories", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should fetch authorized repositories with default pagination", async () => {
    const fetchSpy = vi.spyOn(client, "githubFetch").mockResolvedValueOnce({
      status: 200,
      headers: new Headers(),
      data: [mockRawRepo1],
    });

    const repos = await getRepositories("fake-token");

    expect(fetchSpy).toHaveBeenCalledWith(
      "/user/repos?per_page=30&page=1",
      "fake-token",
    );
    expect(repos).toHaveLength(1);
    expect(repos[0].name).toBe("buttler");
    expect(repos[0].fullName).toBe("omermecitoglu/buttler");
    expect(repos[0].cloneUrl).toBe("https://github.com/omermecitoglu/buttler.git");
    expect(repos[0].defaultBranch).toBe("alpha");
    expect(repos[0].owner.login).toBe("omermecitoglu");
    expect(repos[0].owner.avatarUrl).toBe("https://github.com/omermecitoglu.png");
  });

  it("should pass sorting and custom query options", async () => {
    const fetchSpy = vi.spyOn(client, "githubFetch").mockResolvedValueOnce({
      status: 200,
      headers: new Headers(),
      data: [mockRawRepo2],
    });

    await getRepositories("fake-token", {
      sort: "pushed",
      direction: "desc",
      visibility: "private",
      affiliation: "owner",
      perPage: 50,
      page: 2,
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      "/user/repos?visibility=private&affiliation=owner&sort=pushed&direction=desc&per_page=50&page=2",
      "fake-token",
    );
  });

  it("should filter repositories when search option is provided", async () => {
    vi.spyOn(client, "githubFetch").mockResolvedValueOnce({
      status: 200,
      headers: new Headers(),
      data: [mockRawRepo1, mockRawRepo2],
    });

    const results = await getRepositories("fake-token", {
      search: "tailwind",
    });

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("tailwind-ui-kit");
  });

  it("should paginate search results properly", async () => {
    vi.spyOn(client, "githubFetch").mockResolvedValueOnce({
      status: 200,
      headers: new Headers(),
      data: [mockRawRepo1, mockRawRepo2],
    });

    const results = await getRepositories("fake-token", {
      search: "omermecitoglu",
      perPage: 1,
      page: 2,
    });

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("tailwind-ui-kit");
  });

  it("should export getUserRepositories and getRepos aliases", () => {
    expect(getUserRepositories).toBe(getRepositories);
    expect(getRepos).toBe(getRepositories);
  });
});
