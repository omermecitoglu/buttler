import { beforeEach, describe, expect, it, vi } from "vitest";
import { listButtlerVolumes } from "./volumes";

const mocks = vi.hoisted(() => ({
  listVolumes: vi.fn(),
}));

vi.mock("~/core/docker", () => ({
  docker: { listVolumes: mocks.listVolumes },
}));

beforeEach(() => {
  vi.resetAllMocks();
});

describe("listButtlerVolumes", () => {
  it("lists only the labelled volumes, sorted by name", async () => {
    mocks.listVolumes.mockResolvedValue({ Volumes: [{ Name: "web-data" }, { Name: "db-data" }] });
    await expect(listButtlerVolumes()).resolves.toEqual(["db-data", "web-data"]);
    expect(mocks.listVolumes).toHaveBeenCalledWith({ filters: { label: ["buttler.volume"] } });
  });
});
