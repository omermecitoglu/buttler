import { beforeEach, describe, expect, it, vi } from "vitest";
import { createServiceAction, restartService, startService, stopService } from "./service";

const mockGetService = vi.fn();
const mockGetDeployableService = vi.fn();
const mockCreateService = vi.fn();
const mockStartServiceContainer = vi.fn();
const mockStopServiceContainer = vi.fn();
const mockRestartServiceContainer = vi.fn();
const mockIsImagePresentLocally = vi.fn();
const mockMarkServicePulling = vi.fn();
const mockFindLatestImage = vi.fn();
const mockStartBuilding = vi.fn();
const mockRevalidatePath = vi.fn();
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
}));

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
  updateTag: (...args: unknown[]) => mockUpdateTag(...args),
}));

vi.mock("~/i18n/navigation", () => ({
  redirect: (...args: unknown[]) => mockRedirect(...args),
}));

describe("service lifecycle server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      expect(mockRevalidatePath).toHaveBeenCalledWith("/");
      expect(mockRevalidatePath).toHaveBeenCalledWith("/services");
      expect(res).toEqual({ success: true });
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
      expect(mockRevalidatePath).toHaveBeenCalledWith("/");
      expect(mockRevalidatePath).toHaveBeenCalledWith("/services");
      expect(res).toEqual({ success: true });
    });

    it("builds a github service in the background if it has no image", async () => {
      const service = { ...sampleService, type: "github", repository: "acme/app", branch: "dev" };
      mockGetDeployableService.mockResolvedValue(service);
      mockFindLatestImage.mockResolvedValue(null);
      expect(await startService("srv-test")).toEqual({ success: true });
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
    it("stops container and revalidates path", async () => {
      mockGetService.mockResolvedValue(sampleService);
      const res = await stopService("srv-test");
      expect(mockStopServiceContainer).toHaveBeenCalledWith(sampleService);
      expect(mockRevalidatePath).toHaveBeenCalledWith("/");
      expect(mockRevalidatePath).toHaveBeenCalledWith("/services");
      expect(res).toEqual({ success: true });
    });

    it("throws if service is not found in database", async () => {
      mockGetService.mockResolvedValue(null);
      await expect(stopService("srv-unknown")).rejects.toThrow("Service not found: srv-unknown");
    });
  });

  describe("restartService", () => {
    it("restarts container and revalidates path", async () => {
      mockGetDeployableService.mockResolvedValue(sampleService);
      const res = await restartService("srv-test");
      expect(mockRestartServiceContainer).toHaveBeenCalledWith(sampleService);
      expect(mockRevalidatePath).toHaveBeenCalledWith("/");
      expect(mockRevalidatePath).toHaveBeenCalledWith("/services");
      expect(res).toEqual({ success: true });
    });

    it("throws if service is not found in database", async () => {
      mockGetDeployableService.mockResolvedValue(null);
      await expect(restartService("srv-unknown")).rejects.toThrow("Service not found: srv-unknown");
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
