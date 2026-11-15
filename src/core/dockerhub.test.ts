import { afterEach, describe, expect, it, vi } from "vitest";
import { getDockerHubTags, parseDockerImageName } from "./dockerhub";

describe("parseDockerImageName", () => {
  it("should handle official single-name images", () => {
    expect(parseDockerImageName("redis")).toEqual({
      namespace: "library",
      repository: "redis",
      tag: undefined,
    });
  });

  it("should handle official images with library namespace prefix", () => {
    expect(parseDockerImageName("library/nginx")).toEqual({
      namespace: "library",
      repository: "nginx",
      tag: undefined,
    });
  });

  it("should handle user/organization namespaced images", () => {
    expect(parseDockerImageName("bitnami/postgresql")).toEqual({
      namespace: "bitnami",
      repository: "postgresql",
      tag: undefined,
    });
  });

  it("should extract tags when present", () => {
    expect(parseDockerImageName("redis:alpine")).toEqual({
      namespace: "library",
      repository: "redis",
      tag: "alpine",
    });

    expect(parseDockerImageName("bitnami/redis:7.2")).toEqual({
      namespace: "bitnami",
      repository: "redis",
      tag: "7.2",
    });
  });

  it("should handle empty or whitespace inputs gracefully", () => {
    expect(parseDockerImageName("")).toEqual({
      namespace: "library",
      repository: "",
      tag: undefined,
    });
    expect(parseDockerImageName("  ")).toEqual({
      namespace: "library",
      repository: "",
      tag: undefined,
    });
  });
});

describe("getDockerHubTags", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return empty array when image repository is empty", async () => {
    const tags = await getDockerHubTags("");
    expect(tags).toEqual([]);
  });

  it("should query Docker Hub registry API and return tag names", async () => {
    const mockResponse = {
      count: 2,
      next: null,
      previous: null,
      results: [
        { name: "latest", tag_status: "active" },
        { name: "alpine", tag_status: "active" },
      ],
    };

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    } as Response);

    const tags = await getDockerHubTags("redis", { pageSize: 10 });

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://hub.docker.com/v2/repositories/library/redis/tags/?page_size=10&page=1",
      expect.objectContaining({
        headers: { Accept: "application/json" },
      }),
    );
    expect(tags).toEqual(["latest", "alpine"]);
  });

  it("should include name filter in query when provided", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ count: 1, results: [{ name: "7.2-alpine" }] }),
    } as Response);

    const tags = await getDockerHubTags("bitnami/redis", { name: "7.2" });

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://hub.docker.com/v2/repositories/bitnami/redis/tags/?page_size=25&page=1&name=7.2",
      expect.anything(),
    );
    expect(tags).toEqual(["7.2-alpine"]);
  });

  it("should return empty array if 404 is returned", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 404,
    } as Response);

    const tags = await getDockerHubTags("nonexistent/unknown-image-xyz");
    expect(tags).toEqual([]);
  });

  it("should handle fetch network errors gracefully", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Network failed"));

    const tags = await getDockerHubTags("redis");
    expect(tags).toEqual([]);
  });
});
