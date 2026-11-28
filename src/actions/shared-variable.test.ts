import { beforeEach, describe, expect, it, vi } from "vitest";
import { saveSharedVariablesAction, updateLinkInheritanceAction } from "./shared-variable";

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  getService: vi.fn(),
  getServiceLinks: vi.fn(),
  getSharedVariables: vi.fn(),
  getInheritedVariables: vi.fn(),
  saveSharedVariables: vi.fn(),
  updateLinkInheritance: vi.fn(),
  recreateRunningServices: vi.fn(),
  updateTag: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ updateTag: mocks.updateTag, refresh: mocks.refresh }));
vi.mock("~/core/auth", () => ({ requireUser: mocks.requireUser }));
vi.mock("~/database", () => ({ default: {} }));
vi.mock("~/operations/getService", () => ({ default: mocks.getService }));
vi.mock("~/operations/getServiceLinks", () => ({
  default: mocks.getServiceLinks,
  getLinkedServiceId: (serviceLink: typeof link, serviceId: string) => {
    return serviceLink.serviceAId === serviceId ? serviceLink.serviceBId : serviceLink.serviceAId;
  },
}));
vi.mock("~/operations/getSharedVariables", () => ({ default: mocks.getSharedVariables }));
vi.mock("~/operations/getInheritedVariables", () => ({ default: mocks.getInheritedVariables }));
vi.mock("~/operations/saveSharedVariables", () => ({ default: mocks.saveSharedVariables }));
vi.mock("~/operations/updateLinkInheritance", () => ({ default: mocks.updateLinkInheritance }));
vi.mock("~/core/recreate", () => ({ recreateRunningServices: mocks.recreateRunningServices }));

const link = {
  id: "l1",
  serviceAId: "app",
  serviceBId: "db",
  serviceAInherits: true,
  serviceBInherits: false,
  createdAt: "2026-11-26 10:00:00",
};

function save(variables: unknown[], recreate = false) {
  const formData = new FormData();
  formData.set("variables", JSON.stringify(variables));
  if (recreate) formData.set("recreate", "on");
  return saveSharedVariablesAction("db", {}, formData);
}

function inherit(serviceId: string, options: { inherits?: boolean, names?: unknown[], recreate?: boolean }) {
  const formData = new FormData();
  if (options.inherits) formData.set("inherits", "on");
  formData.set("names", JSON.stringify(options.names ?? []));
  if (options.recreate) formData.set("recreate", "on");
  return updateLinkInheritanceAction(serviceId, "l1", {}, formData);
}

describe("shared variable actions", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requireUser.mockResolvedValue({ id: 2, role: "member", profile: null });
    mocks.getService.mockImplementation((_db: unknown, id: string) => Promise.resolve({ id, type: "dockerhub" }));
    mocks.getServiceLinks.mockResolvedValue([link]);
    mocks.getSharedVariables.mockResolvedValue([{ id: "v1", serviceId: "db", key: "POSTGRES_HOST", template: "{host}" }]);
    mocks.getInheritedVariables.mockResolvedValue([]);
    mocks.updateLinkInheritance.mockReturnValue(link);
    mocks.recreateRunningServices.mockResolvedValue([]);
  });

  it("should save the shared variables of a service", async () => {
    const variables = [{ id: "v1", key: "POSTGRES_HOST", template: "{host}" }, { key: "POSTGRES_PORT", template: "5432" }];
    expect(await save(variables)).toEqual({ "[success]": "saved" });
    expect(mocks.saveSharedVariables).toHaveBeenCalledWith({}, "db", variables);
    expect(mocks.updateTag).toHaveBeenCalledWith("getSharedVariablesOfService(db)");
    expect(mocks.updateTag).toHaveBeenCalledWith("getInheritedVariablesOfService(...)");
    expect(mocks.recreateRunningServices).not.toHaveBeenCalled();
  });

  it("should reject users without access", async () => {
    mocks.requireUser.mockRejectedValue(new Error("401"));
    await expect(save([])).rejects.toThrow("401");
    expect(mocks.saveSharedVariables).not.toHaveBeenCalled();
  });

  it("should not save duplicate keys or system services", async () => {
    expect(await save([{ key: "A", template: "" }, { key: "A", template: "" }])).toEqual({ "[error]": "duplicate_keys" });
    mocks.getService.mockResolvedValue({ id: "db", type: "system" });
    expect(await save([])).toEqual({ "[error]": "save_failed" });
    expect(mocks.saveSharedVariables).not.toHaveBeenCalled();
  });

  it("should only recreate the services that inherit the variables", async () => {
    expect(await save([], true)).toEqual({ "[success]": "recreated" });
    expect(mocks.recreateRunningServices).toHaveBeenCalledWith(["app"]);
    expect(mocks.refresh).toHaveBeenCalled();
    mocks.recreateRunningServices.mockResolvedValue(["app"]);
    expect(await save([], true)).toEqual({ "[error]": "recreate_failed" });
  });

  it("should let a side of a link inherit and rename variables", async () => {
    const names = [{ sharedVariableId: "v1", name: "DB_HOST" }];
    expect(await inherit("app", { inherits: true, names, recreate: true })).toEqual({ "[success]": "recreated" });
    expect(mocks.updateLinkInheritance).toHaveBeenCalledWith({}, "app", "l1", { inherits: true, names });
    expect(mocks.getSharedVariables).toHaveBeenCalledWith({}, "db");
    expect(mocks.updateTag).toHaveBeenCalledWith("getLinksOfService(db)");
    expect(mocks.recreateRunningServices).toHaveBeenCalledWith(["app"]);
  });

  it("should block names that are inherited through another link", async () => {
    mocks.getInheritedVariables.mockResolvedValue([
      { linkId: "l1", name: "POSTGRES_HOST" },
      { linkId: "l2", name: "DB_HOST" },
    ]);
    expect(await inherit("app", { inherits: true })).toEqual({ "[success]": "saved" });
    const names = [{ sharedVariableId: "v1", name: "DB_HOST" }];
    expect(await inherit("app", { inherits: true, names })).toEqual({ "[error]": "duplicate_names" });
    expect(mocks.updateLinkInheritance).toHaveBeenCalledTimes(1);
    // Nothing is inherited, so nothing can collide
    expect(await inherit("app", { names })).toEqual({ "[success]": "saved" });
  });

  it("should not change a link of another service", async () => {
    mocks.getServiceLinks.mockResolvedValue([]);
    expect(await inherit("other", { inherits: true })).toEqual({ "[error]": "update_failed" });
    expect(mocks.updateLinkInheritance).not.toHaveBeenCalled();
  });

  it("should not change the links of system services", async () => {
    mocks.getService.mockImplementation((_db: unknown, id: string) => {
      return Promise.resolve({ id, type: id === "app" ? "dockerhub" : "system" });
    });
    expect(await inherit("app", { inherits: true })).toEqual({ "[error]": "update_failed" });
    expect(mocks.updateLinkInheritance).not.toHaveBeenCalled();
  });
});
