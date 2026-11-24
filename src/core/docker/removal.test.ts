import { beforeEach, describe, expect, it, vi } from "vitest";
import { removeServiceContainers, removeServiceImages, removeVolumes } from "./removal";

const mocks = vi.hoisted(() => ({
  listContainers: vi.fn(),
  getContainer: vi.fn(),
  getImage: vi.fn(),
  getVolume: vi.fn(),
  listServiceImages: vi.fn(),
  stop: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("~/core/docker", () => ({
  docker: {
    listContainers: mocks.listContainers,
    getContainer: mocks.getContainer,
    getImage: mocks.getImage,
    getVolume: mocks.getVolume,
  },
}));
vi.mock("./builds", () => ({ listServiceImages: mocks.listServiceImages }));

const dockerError = (statusCode: number) => Object.assign(new Error(`status ${statusCode}`), { statusCode });

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getContainer.mockReturnValue({ stop: mocks.stop, remove: mocks.remove });
  mocks.getImage.mockReturnValue({ remove: mocks.remove });
  mocks.getVolume.mockReturnValue({ remove: mocks.remove });
  mocks.stop.mockResolvedValue(undefined);
  mocks.remove.mockResolvedValue(undefined);
});

describe("removeServiceContainers", () => {
  beforeEach(() => {
    mocks.listContainers.mockResolvedValue([
      { Id: "labelled", Names: ["/renamed"], Labels: { "buttler.service-id": "srv" } },
      { Id: "named", Names: ["/buttler-service-srv"], Labels: {} },
      { Id: "other", Names: ["/buttler-service-other"], Labels: { "buttler.service-id": "other" } },
      { Id: "unrelated", Names: ["/postgres"], Labels: {} },
    ]);
  });

  it("should only remove the containers of the service", async () => {
    await removeServiceContainers("srv");
    expect(mocks.getContainer.mock.calls).toEqual([["labelled"], ["named"]]);
    expect(mocks.remove).toHaveBeenCalledTimes(2);
  });

  it("should remove the containers that are already stopped", async () => {
    mocks.stop.mockRejectedValue(dockerError(304));
    await removeServiceContainers("srv");
    expect(mocks.remove).toHaveBeenCalledTimes(2);
  });

  it("should ignore the containers that are already gone", async () => {
    mocks.stop.mockRejectedValue(dockerError(404));
    mocks.remove.mockRejectedValue(dockerError(404));
    await expect(removeServiceContainers("srv")).resolves.toBeUndefined();
  });

  it("should fail if Docker fails", async () => {
    mocks.remove.mockRejectedValue(dockerError(500));
    await expect(removeServiceContainers("srv")).rejects.toThrow("status 500");
  });

  it("should fail if Docker is not available", async () => {
    mocks.listContainers.mockRejectedValue(new Error("ECONNREFUSED"));
    await expect(removeServiceContainers("srv")).rejects.toThrow("ECONNREFUSED");
  });
});

describe("removeServiceImages", () => {
  beforeEach(() => {
    mocks.listServiceImages.mockResolvedValue([{ id: "sha256:new" }, { id: "sha256:old" }]);
  });

  it("should remove all images of the service", async () => {
    await removeServiceImages("srv");
    expect(mocks.listServiceImages).toHaveBeenCalledWith("srv");
    expect(mocks.getImage.mock.calls).toEqual([["sha256:new"], ["sha256:old"]]);
    expect(mocks.remove).toHaveBeenCalledTimes(2);
  });

  it.each([404, 409])("should go on after the status %i", async statusCode => {
    mocks.remove.mockRejectedValueOnce(dockerError(statusCode));
    await removeServiceImages("srv");
    expect(mocks.remove).toHaveBeenCalledTimes(2);
  });

  it("should fail if Docker fails", async () => {
    mocks.remove.mockRejectedValue(dockerError(500));
    await expect(removeServiceImages("srv")).rejects.toThrow("status 500");
  });
});

describe("removeVolumes", () => {
  it("should remove each volume once", async () => {
    await removeVolumes(["data", "cache", "data"]);
    expect(mocks.getVolume.mock.calls).toEqual([["data"], ["cache"]]);
    expect(mocks.remove).toHaveBeenCalledTimes(2);
  });

  it("should never touch the paths on the host", async () => {
    await removeVolumes(["/srv/data", "../containers/app", "./data", "a/b"]);
    expect(mocks.getVolume).not.toHaveBeenCalled();
  });

  it.each([404, 409])("should go on after the status %i", async statusCode => {
    mocks.remove.mockRejectedValueOnce(dockerError(statusCode));
    await removeVolumes(["data", "cache"]);
    expect(mocks.remove).toHaveBeenCalledTimes(2);
  });

  it("should fail if Docker fails", async () => {
    mocks.remove.mockRejectedValue(dockerError(500));
    await expect(removeVolumes(["data"])).rejects.toThrow("status 500");
  });
});
