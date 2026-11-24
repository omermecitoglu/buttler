import { beforeEach, describe, expect, it, vi } from "vitest";
import { getBuildingServiceIds, getServiceBuilds, listServiceImages } from "./builds";
import type { BuildRecord } from "./build-history";

const mocks = vi.hoisted(() => ({
  listImages: vi.fn(),
  listBuildRecords: vi.fn(),
}));

vi.mock("~/core/docker", () => ({ docker: { listImages: mocks.listImages, modem: "modem" } }));
vi.mock("./build-history", () => ({ listBuildRecords: mocks.listBuildRecords }));

const labels = (serviceId: string, commit: string, builtAt: string) => ({
  "buttler.service-id": serviceId,
  "buttler.branch": "main",
  "buttler.commit": commit,
  "buttler.built-at": builtAt,
});

const oldImage = {
  Id: "sha256:old",
  RepoTags: null,
  Labels: labels("srv", "aaa", "2026-01-01T00:00:00.000Z"),
  Size: 100,
  Created: 1,
};

const newImage = {
  Id: "sha256:new",
  RepoTags: ["buttler/app:ccc", "buttler/app:latest"],
  Labels: labels("srv", "ccc", "2026-01-03T00:00:00.000Z"),
  Size: 200,
  Created: 1,
};

const record = (ref: string, data: Partial<BuildRecord>): BuildRecord => ({
  ref,
  labels: {},
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  completedAt: new Date("2026-01-01T00:01:00.000Z"),
  error: null,
  ...data,
});

const records = [
  record("failed", { labels: labels("srv", "bbb", "2026-01-02T00:00:00.000Z"), error: "exit code: 1" }),
  record("active", { labels: labels("srv", "ddd", "2026-01-04T00:00:00.000Z"), completedAt: null }),
  record("done", { labels: labels("srv", "ccc", "2026-01-03T00:00:00.000Z") }),
  record("other-service", { labels: labels("other", "eee", "2026-01-05T00:00:00.000Z"), error: "boom" }),
  record("unrelated", { completedAt: null }),
];

describe("builds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listImages.mockResolvedValue([oldImage, newImage]);
    mocks.listBuildRecords.mockResolvedValue(records);
  });

  it("should list the images of a service, the newest first", async () => {
    expect(await listServiceImages("srv")).toEqual([
      {
        id: "sha256:new",
        serviceId: "srv",
        branch: "main",
        commit: "ccc",
        tags: ["buttler/app:ccc", "buttler/app:latest"],
        size: 200,
        builtAt: "2026-01-03T00:00:00.000Z",
      },
      expect.objectContaining({ id: "sha256:old", tags: [] }),
    ]);
    expect(mocks.listImages).toHaveBeenCalledWith({ filters: { label: ["buttler.service-id=srv"] } });
  });

  it("should list the images of all services", async () => {
    await listServiceImages();
    expect(mocks.listImages).toHaveBeenCalledWith({ filters: { label: ["buttler.service-id"] } });
  });

  it("should fall back to the creation date of the image", async () => {
    mocks.listImages.mockResolvedValue([{
      ...oldImage,
      RepoTags: ["<none>:<none>"],
      Labels: { "buttler.service-id": "srv" },
    }]);
    expect(await listServiceImages("srv")).toEqual([
      expect.objectContaining({ branch: null, commit: null, tags: [], builtAt: "1970-01-01T00:00:01.000Z" }),
    ]);
  });

  it("should combine images with failed and active builds", async () => {
    expect(await getServiceBuilds("srv")).toEqual([
      { id: "active", status: "building", branch: "main", commit: "ddd", builtAt: "2026-01-04T00:00:00.000Z" },
      {
        id: "sha256:new",
        status: "ready",
        branch: "main",
        commit: "ccc",
        tags: ["buttler/app:ccc", "buttler/app:latest"],
        size: 200,
        builtAt: "2026-01-03T00:00:00.000Z",
      },
      {
        id: "failed",
        status: "failed",
        branch: "main",
        commit: "bbb",
        builtAt: "2026-01-02T00:00:00.000Z",
        error: "exit code: 1",
      },
      expect.objectContaining({ id: "sha256:old", status: "ready" }),
    ]);
  });

  it("should still return the images when the history is not available", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.listBuildRecords.mockRejectedValue(new Error("unavailable"));
    expect(await getServiceBuilds("srv")).toHaveLength(2);
    expect(await getBuildingServiceIds()).toEqual(new Set());
    expect(consoleError).toHaveBeenCalledTimes(2);
    consoleError.mockRestore();
  });

  it("should find the services that are being built", async () => {
    expect(await getBuildingServiceIds()).toEqual(new Set(["srv"]));
  });
});
