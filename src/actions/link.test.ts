import { beforeEach, describe, expect, it, vi } from "vitest";
import { addLinkAction, removeLinkAction } from "./link";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  getService: vi.fn(),
  createServiceLink: vi.fn(),
  deleteServiceLink: vi.fn(),
  getServiceLinks: vi.fn(),
  syncLinkNetwork: vi.fn(),
  updateTag: vi.fn(),
  refresh: vi.fn(),
  recreateRunningServices: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ updateTag: mocks.updateTag, refresh: mocks.refresh }));
vi.mock("~/core/recreate", () => ({ recreateRunningServices: mocks.recreateRunningServices }));
vi.mock("~/core/auth", () => ({ requireUser: mocks.requireUser }));
vi.mock("~/database", () => ({ default: {} }));
vi.mock("~/core/docker/links", () => ({ syncLinkNetwork: mocks.syncLinkNetwork }));
vi.mock("~/operations/getService", () => ({ default: mocks.getService }));
vi.mock("~/operations/createServiceLink", () => ({ default: mocks.createServiceLink }));
vi.mock("~/operations/deleteServiceLink", () => ({ default: mocks.deleteServiceLink }));
vi.mock("~/operations/getServiceLinks", () => ({ default: mocks.getServiceLinks }));

const link = { id: "l1", serviceAId: "api", serviceBId: "app", createdAt: "2026-11-26 10:00:00" };

function add(linkedServiceId: string) {
  const formData = new FormData();
  formData.set("linkedServiceId", linkedServiceId);
  return addLinkAction("app", {}, formData);
}

function remove(linkId: string, recreate = false) {
  const formData = new FormData();
  if (recreate) formData.set("recreate", "on");
  return removeLinkAction("app", linkId, {}, formData);
}

describe("link actions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requireUser.mockResolvedValue({ id: 2, role: "member", profile: null });
    mocks.getService.mockImplementation((_db: unknown, id: string) => Promise.resolve({ id, type: "github" }));
    mocks.createServiceLink.mockResolvedValue(link);
    mocks.deleteServiceLink.mockResolvedValue(link);
    mocks.getServiceLinks.mockResolvedValue([link]);
  });

  it("should let members link services", async () => {
    expect(await add("api")).toEqual({});
    expect(mocks.requireUser).toHaveBeenCalled();
    expect(mocks.createServiceLink).toHaveBeenCalledWith({}, "app", "api");
    expect(mocks.syncLinkNetwork).toHaveBeenCalledWith("l1");
    expect(mocks.updateTag).toHaveBeenCalledWith("getLinksOfService(app)");
    expect(mocks.updateTag).toHaveBeenCalledWith("getLinksOfService(api)");
  });

  it("should reject users without access", async () => {
    mocks.requireUser.mockRejectedValue(new Error("401"));
    await expect(add("api")).rejects.toThrow("401");
    expect(mocks.createServiceLink).not.toHaveBeenCalled();
  });

  it("should not link system services or missing ones", async () => {
    mocks.getService.mockImplementation((_db: unknown, id: string) => {
      return Promise.resolve(id === "api" ? { id, type: "system" } : null);
    });
    expect(await add("api")).toEqual({ "[error]": "add_failed" });
    mocks.getService.mockImplementation((_db: unknown, id: string) => Promise.resolve(id === "app" ? { id, type: "github" } : null));
    expect(await add("gone")).toEqual({ "[error]": "add_failed" });
    expect(mocks.createServiceLink).not.toHaveBeenCalled();
  });

  it("should not link the same services twice", async () => {
    mocks.createServiceLink.mockResolvedValue(undefined);
    expect(await add("api")).toEqual({ "[error]": "already_linked" });
    expect(mocks.syncLinkNetwork).not.toHaveBeenCalled();
  });

  it("should not keep a link whose network can't be set up", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.syncLinkNetwork.mockRejectedValueOnce(new Error("no subnet"));
    expect(await add("api")).toEqual({ "[error]": "connect_failed" });
    expect(mocks.deleteServiceLink).toHaveBeenCalledWith({}, "app", "l1");
    expect(mocks.syncLinkNetwork).toHaveBeenCalledTimes(2);
    expect(mocks.updateTag).not.toHaveBeenCalled();
  });

  it("should remove a link and its network", async () => {
    expect(await remove("l1")).toEqual({});
    expect(mocks.deleteServiceLink).toHaveBeenCalledWith({}, "app", "l1");
    expect(mocks.syncLinkNetwork).toHaveBeenCalledAfter(mocks.deleteServiceLink);
    expect(mocks.updateTag).toHaveBeenCalledWith("getLinksOfService(api)");
  });

  it("should not remove a link of another service", async () => {
    mocks.getServiceLinks.mockResolvedValue([]);
    expect(await remove("l1")).toEqual({ "[error]": "remove_failed" });
    expect(mocks.getServiceLinks).toHaveBeenCalledWith({}, "app");
    expect(mocks.deleteServiceLink).not.toHaveBeenCalled();
    expect(mocks.syncLinkNetwork).not.toHaveBeenCalled();
  });

  it("should not remove the links of system services", async () => {
    mocks.getService.mockImplementation((_db: unknown, id: string) => {
      return Promise.resolve({ id, type: id === "api" ? "system" : "github" });
    });
    expect(await remove("l1")).toEqual({ "[error]": "remove_failed" });
    expect(mocks.deleteServiceLink).not.toHaveBeenCalled();
    expect(mocks.syncLinkNetwork).not.toHaveBeenCalled();
  });

  it("should restore a link whose network can't be removed", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.syncLinkNetwork.mockRejectedValue(new Error("no docker"));
    expect(await remove("l1")).toEqual({ "[error]": "disconnect_failed" });
    expect(mocks.createServiceLink).toHaveBeenCalledWith({}, "api", "app", "l1");
    expect(mocks.updateTag).not.toHaveBeenCalled();
  });

  it("should recreate the services that inherited through the removed link", async () => {
    mocks.getServiceLinks.mockResolvedValue([{ ...link, serviceAInherits: false, serviceBInherits: true }]);
    mocks.recreateRunningServices.mockResolvedValue([]);
    expect(await remove("l1")).toEqual({});
    expect(mocks.recreateRunningServices).not.toHaveBeenCalled();
    expect(await remove("l1", true)).toEqual({});
    expect(mocks.recreateRunningServices).toHaveBeenCalledWith(["app"]);
    expect(mocks.recreateRunningServices).toHaveBeenCalledAfter(mocks.syncLinkNetwork);
    mocks.recreateRunningServices.mockResolvedValue(["app"]);
    expect(await remove("l1", true)).toEqual({ "[error]": "recreate_failed" });
  });
});
