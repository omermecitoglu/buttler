import { beforeEach, describe, expect, it, vi } from "vitest";
import { MissingSecretValueError } from "~/operations/updateService";
import {
  createServiceAction,
  redeployService,
  restartService,
  startService,
  stopService,
  triggerBuild,
  updateServiceAction,
} from "./service";

const mockGetService = vi.fn();
const mockGetDeployableService = vi.fn();
const mockCreateService = vi.fn();
const mockStartServiceContainer = vi.fn();
const mockStopServiceContainer = vi.fn();
const mockRestartServiceContainer = vi.fn();
const mockIsImagePresentLocally = vi.fn();
const mockMarkServicePulling = vi.fn();
const mockIsServiceBuilding = vi.fn();
const mockIsServicePulling = vi.fn();
const mockPullAndDeployService = vi.fn();
const mockAfter = vi.fn();
const mockFindLatestImage = vi.fn();
const mockStartBuilding = vi.fn();
const mockUpdateService = vi.fn();
const mockRefresh = vi.fn();
const mockUpdateTag = vi.fn();
const mockRedirect = vi.fn();

vi.mock("~/database", () => ({
  default: {},
}));

vi.mock("~/operations/getService", () => ({
  default: (...args: unknown[]) => mockGetService(...args),
}));

vi.mock("~/operations/getDeployableService", () => ({
  default: (...args: unknown[]) => mockGetDeployableService(...args),
}));

vi.mock("~/operations/createService", () => ({
  default: (...args: unknown[]) => mockCreateService(...args),
}));

vi.mock("~/operations/updateService", () => ({
  default: (...args: unknown[]) => mockUpdateService(...args),
  MissingSecretValueError: class extends Error {},
}));

vi.mock("~/core/auth", () => ({
  requireUser: vi.fn(),
  userMiddleware: vi.fn(),
}));

vi.mock("~/core/build", () => ({
  findLatestImage: (...args: unknown[]) => mockFindLatestImage(...args),
  startBuilding: (...args: unknown[]) => mockStartBuilding(...args),
}));

vi.mock("~/core/docker/status", () => ({
  startServiceContainer: (...args: unknown[]) => mockStartServiceContainer(...args),
  stopServiceContainer: (...args: unknown[]) => mockStopServiceContainer(...args),
  restartServiceContainer: (...args: unknown[]) => mockRestartServiceContainer(...args),
  isImagePresentLocally: (...args: unknown[]) => mockIsImagePresentLocally(...args),
  markServicePulling: (...args: unknown[]) => mockMarkServicePulling(...args),
  isServiceBuilding: (...args: unknown[]) => mockIsServiceBuilding(...args),
  isServicePulling: (...args: unknown[]) => mockIsServicePulling(...args),
  pullAndDeployService: (...args: unknown[]) => mockPullAndDeployService(...args),
}));

vi.mock("next/server", () => ({
  after: (...args: unknown[]) => mockAfter(...args),
}));

vi.mock("next/cache", () => ({
  refresh: (...args: unknown[]) => mockRefresh(...args),
  updateTag: (...args: unknown[]) => mockUpdateTag(...args),
}));

vi.mock("~/i18n/navigation", () => ({
  redirect: (...args: unknown[]) => mockRedirect(...args),
}));

describe("service lifecycle server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsServiceBuilding.mockReturnValue(false);
    mockIsServicePulling.mockReturnValue(false);
  });

  const sampleService = {
    id: "srv-test",
    name: "Web Service",
    type: "dockerhub",
  };

  describe("startService", () => {
    it("starts container directly if image is already present", async () => {
      mockGetDeployableService.mockResolvedValue({
        ...sampleService,
        repository: "redis",
        branch: "alpine",
      });
      mockIsImagePresentLocally.mockResolvedValue(true);
      const res = await startService("srv-test");
      expect(mockStartServiceContainer).toHaveBeenCalled();
      expect(mockRefresh).toHaveBeenCalled();
      expect(res).toEqual({ outcome: "started" });
    });

    it("marks service pulling and starts background task if image is not present", async () => {
      mockGetDeployableService.mockResolvedValue({
        ...sampleService,
        repository: "postgres",
        branch: "15",
      });
      mockIsImagePresentLocally.mockResolvedValue(false);
      const res = await startService("srv-test");
      expect(mockMarkServicePulling).toHaveBeenCalledWith("srv-test", true);
      expect(mockRefresh).toHaveBeenCalled();
      expect(res).toEqual({ outcome: "pulling" });
    });

    it("builds a github service in the background if it has no image", async () => {
      const service = { ...sampleService, type: "github", repository: "acme/app", branch: "dev" };
      mockGetDeployableService.mockResolvedValue(service);
      mockFindLatestImage.mockResolvedValue(null);
      expect(await startService("srv-test")).toEqual({ outcome: "building" });
      expect(mockStartBuilding).toHaveBeenCalledWith(service);
      expect(mockStartServiceContainer).not.toHaveBeenCalled();
    });

    it("starts a github service from its existing image", async () => {
      mockGetDeployableService.mockResolvedValue({ ...sampleService, type: "github" });
      mockFindLatestImage.mockResolvedValue("sha256:abc");
      await startService("srv-test");
      expect(mockStartServiceContainer).toHaveBeenCalled();
      expect(mockStartBuilding).not.toHaveBeenCalled();
    });

    it("throws if service is not found in database", async () => {
      mockGetDeployableService.mockResolvedValue(null);
      await expect(startService("srv-unknown")).rejects.toThrow("Service not found: srv-unknown");
      expect(mockStartServiceContainer).not.toHaveBeenCalled();
    });
  });

  describe("stopService", () => {
    it("stops container and refreshes the page", async () => {
      mockGetService.mockResolvedValue(sampleService);
      const res = await stopService("srv-test");
      expect(mockStopServiceContainer).toHaveBeenCalledWith(sampleService);
      expect(mockRefresh).toHaveBeenCalled();
      expect(res).toEqual({ outcome: "stopped" });
    });

    it("throws if service is not found in database", async () => {
      mockGetService.mockResolvedValue(null);
      await expect(stopService("srv-unknown")).rejects.toThrow("Service not found: srv-unknown");
    });
  });

  describe("restartService", () => {
    it("restarts container and refreshes the page", async () => {
      mockGetDeployableService.mockResolvedValue(sampleService);
      const res = await restartService("srv-test");
      expect(mockRestartServiceContainer).toHaveBeenCalledWith(sampleService);
      expect(mockRefresh).toHaveBeenCalled();
      expect(res).toEqual({ outcome: "restarted" });
    });

    it("throws if service is not found in database", async () => {
      mockGetDeployableService.mockResolvedValue(null);
      await expect(restartService("srv-unknown")).rejects.toThrow("Service not found: srv-unknown");
    });
  });

  describe("triggerBuild", () => {
    it("builds a github service", async () => {
      const service = { ...sampleService, type: "github" };
      mockGetDeployableService.mockResolvedValue(service);
      expect(await triggerBuild("srv-test")).toEqual({ outcome: "building" });
      expect(mockStartBuilding).toHaveBeenCalledWith(service);
      expect(mockRefresh).toHaveBeenCalled();
    });

    it("does not queue another build during a build", async () => {
      mockGetDeployableService.mockResolvedValue({ ...sampleService, type: "github" });
      mockIsServiceBuilding.mockReturnValue(true);
      expect(await triggerBuild("srv-test")).toEqual({ outcome: "building" });
      expect(mockStartBuilding).not.toHaveBeenCalled();
    });

    it.each(["dockerhub", "system"])("rejects %s services", async type => {
      mockGetDeployableService.mockResolvedValue({ ...sampleService, type });
      await expect(triggerBuild("srv-test")).rejects.toThrow("Service cannot be built: srv-test");
      expect(mockStartBuilding).not.toHaveBeenCalled();
    });

    it("throws if service is not found in database", async () => {
      mockGetDeployableService.mockResolvedValue(null);
      await expect(triggerBuild("srv-unknown")).rejects.toThrow("Service not found: srv-unknown");
    });
  });

  describe("redeployService", () => {
    it("pulls and deploys a dockerhub service after the response", async () => {
      mockGetDeployableService.mockResolvedValue(sampleService);
      expect(await redeployService("srv-test")).toEqual({ outcome: "pulling" });
      expect(mockMarkServicePulling).toHaveBeenCalledWith("srv-test", true);
      expect(mockRefresh).toHaveBeenCalled();
      expect(mockPullAndDeployService).not.toHaveBeenCalled();
      const [task] = mockAfter.mock.calls[0] as [() => Promise<void>];
      await task();
      expect(mockPullAndDeployService).toHaveBeenCalledWith(sampleService);
    });

    it("logs the errors of the background task", async () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
      mockGetDeployableService.mockResolvedValue(sampleService);
      mockPullAndDeployService.mockRejectedValueOnce(new Error("no network"));
      await redeployService("srv-test");
      const [task] = mockAfter.mock.calls[0] as [() => Promise<void>];
      await expect(task()).resolves.toBeUndefined();
      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });

    it("does not pull again during a pull", async () => {
      mockGetDeployableService.mockResolvedValue(sampleService);
      mockIsServicePulling.mockReturnValue(true);
      expect(await redeployService("srv-test")).toEqual({ outcome: "pulling" });
      expect(mockAfter).not.toHaveBeenCalled();
    });

    it("runs the last known image of other services again", async () => {
      const service = { ...sampleService, type: "github" };
      mockGetDeployableService.mockResolvedValue(service);
      expect(await redeployService("srv-test")).toEqual({ outcome: "restarted" });
      expect(mockRestartServiceContainer).toHaveBeenCalledWith(service);
    });
  });

  describe("createServiceAction", () => {
    it("validates and creates a service with configurations and redirects", async () => {
      mockCreateService.mockReturnValue({ id: "srv-new", type: "github" });
      const formData = new FormData();
      formData.set("name", "My API Service");
      formData.set("type", "github");
      formData.set("repository", "org/repo");
      formData.set("branch", "main");
      formData.set("ports", JSON.stringify([{ external: 3000, internal: 3000 }]));
      formData.set("environmentVariables", JSON.stringify([
        { key: "NODE_ENV", value: "production" },
        { key: "NPM_TOKEN", value: "t", scope: "build", isSecret: true },
      ]));
      formData.set("volumes", JSON.stringify([{ name: "app-data", containerPath: "/data" }]));

      await createServiceAction("en", {}, formData);

      const environmentVariables = [
        { key: "NODE_ENV", value: "production", scope: "runtime", isSecret: false },
        { key: "NPM_TOKEN", value: "t", scope: "build", isSecret: true },
      ];
      expect(mockCreateService).toHaveBeenCalledWith(expect.anything(), {
        name: "My API Service",
        type: "github",
        repository: "org/repo",
        branch: "main",
        ports: [{ external: 3000, internal: 3000 }],
        environmentVariables,
        volumes: [{ name: "app-data", containerPath: "/data" }],
      });
      expect(mockStartBuilding).toHaveBeenCalledWith({
        id: "srv-new",
        type: "github",
        ports: [{ external: 3000, internal: 3000 }],
        environmentVariables,
        volumes: [{ name: "app-data", containerPath: "/data" }],
      });
      expect(mockUpdateTag).toHaveBeenCalledWith("getAllServices()");
      expect(mockRedirect).toHaveBeenCalledWith({ locale: "en", href: "/services" });
    });

    it("makes the variables of services without a build step available at runtime", async () => {
      mockCreateService.mockReturnValue({ id: "srv-dh", type: "dockerhub" });
      const formData = new FormData();
      formData.set("name", "Cache");
      formData.set("type", "dockerhub");
      formData.set("repository", "redis");
      formData.set("branch", "latest");
      formData.set("environmentVariables", JSON.stringify([
        { key: "PASSWORD", value: "p", scope: "build", isSecret: true },
      ]));

      await createServiceAction("en", {}, formData);

      expect(mockCreateService).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
        environmentVariables: [{ key: "PASSWORD", value: "p", scope: "runtime", isSecret: true }],
      }));
    });

    it("returns validation errors if required fields are missing", async () => {
      const formData = new FormData();
      formData.set("name", "");
      formData.set("type", "github");

      const errors = await createServiceAction("en", {}, formData);

      expect(errors).toHaveProperty("name");
      expect(mockCreateService).not.toHaveBeenCalled();
    });

    it("returns error message if createService operation throws", async () => {
      mockCreateService.mockImplementation(() => {
        throw new Error("DB error");
      });
      const formData = new FormData();
      formData.set("name", "Test Service");
      formData.set("type", "dockerhub");
      formData.set("repository", "redis");
      formData.set("branch", "alpine");

      const res = await createServiceAction("en", {}, formData);
      expect(res).toEqual({ "[error]": "create_failed" });
    });
  });
});

describe("updateServiceAction", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  function createFormData() {
    const formData = new FormData();
    formData.append("name", "app");
    formData.append("repository", "redis");
    formData.append("branch", "alpine");
    formData.append("environmentVariables", JSON.stringify([
      { key: "TOKEN", value: null, scope: "both", isSecret: true },
    ]));
    return formData;
  }

  it("saves the service and updates its caches", async () => {
    mockGetService.mockResolvedValue({ id: "srv", type: "dockerhub" });
    expect(await updateServiceAction("srv", {}, createFormData())).toEqual({});
    expect(mockUpdateService).toHaveBeenCalledWith({}, "srv", {
      name: "app",
      repository: "redis",
      branch: "alpine",
      // Docker Hub services don't have a build step
      environmentVariables: [{ key: "TOKEN", value: null, scope: "runtime", isSecret: true }],
    });
    expect(mockUpdateTag).toHaveBeenCalledWith("getAllServices()");
    expect(mockUpdateTag).toHaveBeenCalledWith("getSingleService(srv)");
  });

  it("leaves the parts that are not submitted untouched", async () => {
    mockGetService.mockResolvedValue({ id: "srv", type: "github" });
    const formData = new FormData();
    formData.append("ports", "[]");
    expect(await updateServiceAction("srv", {}, formData)).toEqual({});
    const [, , changes] = mockUpdateService.mock.calls[0] as [unknown, unknown, Record<string, unknown>];
    expect(Object.entries(changes).filter(([, value]) => value !== undefined)).toEqual([["ports", []]]);
  });

  it("asks for the values of the secrets that cannot be kept", async () => {
    mockGetService.mockResolvedValue({ id: "srv", type: "github" });
    mockUpdateService.mockImplementation(() => {
      throw new MissingSecretValueError("TOKEN");
    });
    expect(await updateServiceAction("srv", {}, createFormData())).toEqual({ "[error]": "secret_value_required" });
    expect(mockUpdateTag).not.toHaveBeenCalled();
  });

  it.each([null, { id: "srv", type: "system" }])("rejects services that cannot be edited", async service => {
    mockGetService.mockResolvedValue(service);
    expect(await updateServiceAction("srv", {}, createFormData())).toEqual({ "[error]": "update_failed" });
    expect(mockUpdateService).not.toHaveBeenCalled();
  });
});
