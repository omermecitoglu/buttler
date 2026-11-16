import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import * as appCore from "~/core/github/app";
import * as reposCore from "~/core/github/repos";
import { GET } from "./route";

describe("GET /api/sources/github/repos", () => {
  it("should return repositories across app installations", async () => {
    vi.spyOn(appCore, "getAllAppInstallationTokens").mockResolvedValueOnce([
      { installationId: 1, accountLogin: "acme", accountType: "Organization", token: "tok_1" },
    ]);

    const mockRepo = {
      id: 101,
      name: "frontend",
      fullName: "acme/frontend",
      full_name: "acme/frontend",
      defaultBranch: "main",
      default_branch: "main",
      private: true,
      owner: {
        id: 1,
        login: "acme",
        avatarUrl: "",
        avatar_url: "",
        htmlUrl: "",
        html_url: "",
        type: "Organization",
      },
      htmlUrl: "",
      html_url: "",
      description: null,
      fork: false,
      url: "",
      cloneUrl: "",
      clone_url: "",
      sshUrl: "",
      ssh_url: "",
      createdAt: "",
      created_at: "",
      updatedAt: "",
      updated_at: "",
      pushedAt: "",
      pushed_at: "",
      language: null,
      archived: false,
      disabled: false,
      openIssuesCount: 0,
      open_issues_count: 0,
      stargazersCount: 0,
      stargazers_count: 0,
      forksCount: 0,
      forks_count: 0,
    } satisfies reposCore.GitHubRepository;

    vi.spyOn(reposCore, "getInstallationRepositories").mockResolvedValueOnce({
      totalCount: 1,
      total_count: 1,
      repositories: [mockRepo],
    });

    const res = await GET();
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.repositories).toHaveLength(1);
    expect(json.repositories[0].fullName).toBe("acme/frontend");
  });

  it("should return 400 when app is not connected or has no installations", async () => {
    vi.spyOn(appCore, "getAllAppInstallationTokens").mockResolvedValueOnce([]);

    const res = await GET();
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toBe("GitHub App is not connected.");
    expect(json.repositories).toEqual([]);
  });

  it("should return 500 when an unexpected error occurs", async () => {
    vi.spyOn(appCore, "getAllAppInstallationTokens").mockRejectedValueOnce(new Error("Database failure"));

    const res = await GET();
    const json = await res.json();
    expect(res.status).toBe(500);
    expect(json.error).toBe("Database failure");
    expect(json.repositories).toEqual([]);
  });
});
