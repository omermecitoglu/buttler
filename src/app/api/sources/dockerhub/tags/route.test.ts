import { describe, expect, it, vi } from "vitest";
import * as dockerhub from "~/core/dockerhub";
import { GET } from "./route";
import type { NextRequest } from "next/server";

vi.mock("~/core/auth", () => ({ requireUser: vi.fn() }));

describe("GET /api/sources/dockerhub/tags", () => {
  it("should return empty tags when image param is missing", async () => {
    const req = {
      nextUrl: new URL("http://localhost/api/sources/dockerhub/tags"),
    } as NextRequest;

    const res = await GET(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json).toEqual({ tags: [] });
  });

  it("should return tags for a valid image", async () => {
    vi.spyOn(dockerhub, "getDockerHubTags").mockResolvedValueOnce(["latest", "alpine"]);

    const req = {
      nextUrl: new URL("http://localhost/api/sources/dockerhub/tags?image=redis"),
    } as NextRequest;

    const res = await GET(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json).toEqual({ tags: ["latest", "alpine"] });
  });

  it("should handle errors gracefully", async () => {
    vi.spyOn(dockerhub, "getDockerHubTags").mockRejectedValueOnce(new Error("Docker Hub down"));

    const req = {
      nextUrl: new URL("http://localhost/api/sources/dockerhub/tags?image=redis"),
    } as NextRequest;

    const res = await GET(req);
    const json = await res.json();
    expect(res.status).toBe(500);
    expect(json.error).toBe("Docker Hub down");
    expect(json.tags).toEqual([]);
  });
});
