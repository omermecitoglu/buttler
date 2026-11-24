import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("~/core/auth", () => ({ requireUser: vi.fn() }));

import * as appCore from "~/core/github/app";
import * as reposCore from "~/core/github/repos";
import { GET } from "./route";
import type { NextRequest } from "next/server";

describe("GET /api/sources/github/branches", () => {
  it("should return 400 when repo param is missing", async () => {
    const req = {
      nextUrl: new URL("http://localhost/api/sources/github/branches"),
    } as NextRequest;

    const res = await GET(req);
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toBe("Query parameter 'repo' is required.");
  });

  it("should return 400 when repo format is invalid", async () => {
    const req = {
      nextUrl: new URL("http://localhost/api/sources/github/branches?repo=invalidrepo"),
    } as NextRequest;

    const res = await GET(req);
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toBe("Invalid repository format. Expected 'owner/repo'.");
  });

  it("should return 400 when installation token is unavailable", async () => {
    vi.spyOn(appCore, "getInstallationTokenForOwner").mockResolvedValueOnce(null);

    const req = {
      nextUrl: new URL("http://localhost/api/sources/github/branches?repo=owner/repo"),
    } as NextRequest;

    const res = await GET(req);
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toBe("GitHub token unavailable.");
    expect(json.branches).toEqual([]);
  });

  it("should return branches for valid repository", async () => {
    vi.spyOn(appCore, "getInstallationTokenForOwner").mockResolvedValueOnce("ghs_token");
    vi.spyOn(reposCore, "getRepositoryBranches").mockResolvedValueOnce([
      { name: "main", protected: true },
      { name: "develop", protected: false },
    ]);

    const req = {
      nextUrl: new URL("http://localhost/api/sources/github/branches?repo=owner/repo"),
    } as NextRequest;

    const res = await GET(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.branches).toEqual(["main", "develop"]);
  });
});
