import { beforeEach, describe, expect, it, vi } from "vitest";
import { createServiceAction, restartService, startService, stopService } from "./service";

const mockGetService = vi.fn();
const mockCreateService = vi.fn();
const mockStartServiceContainer = vi.fn();
const mockStopServiceContainer = vi.fn();
const mockRestartServiceContainer = vi.fn();
const mockRevalidatePath = vi.fn();
const mockUpdateTag = vi.fn();
const mockRedirect = vi.fn();

vi.mock("~/database", () => ({
  default: {},
}));

vi.mock("~/operations/getService", () => ({
  default: (...args: unknown[]) => mockGetService(...args),
}));

vi.mock("~/operations/createService", () => ({
  default: (...args: unknown[]) => mockCreateService(...args),
}));

vi.mock("~/core/docker/status", () => ({
  startServiceContainer: (...args: unknown[]) => mockStartServiceContainer(...args),
  stopServiceContainer: (...args: unknown[]) => mockStopServiceContainer(...args),
  restartServiceContainer: (...args: unknown[]) => mockRestartServiceContainer(...args),
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
    it("starts container and revalidates path", async () => {
      mockGetService.mockResolvedValue(sampleService);
      const res = await startService("srv-test");
      expect(mockStartServiceContainer).toHaveBeenCalledWith(sampleService);
      expect(mockRevalidatePath).toHaveBeenCalledWith("/");
      expect(mockRevalidatePath).toHaveBeenCalledWith("/services");
      expect(res).toEqual({ success: true });
    });

    it("throws if service is not found in database", async () => {
      mockGetService.mockResolvedValue(null);
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
      mockGetService.mockResolvedValue(sampleService);
      const res = await restartService("srv-test");
      expect(mockRestartServiceContainer).toHaveBeenCalledWith(sampleService);
      expect(mockRevalidatePath).toHaveBeenCalledWith("/");
      expect(mockRevalidatePath).toHaveBeenCalledWith("/services");
      expect(res).toEqual({ success: true });
    });

    it("throws if service is not found in database", async () => {
      mockGetService.mockResolvedValue(null);
      await expect(restartService("srv-unknown")).rejects.toThrow("Service not found: srv-unknown");
    });
  });

  describe("createServiceAction", () => {
    it("validates and creates a service with configurations and redirects", async () => {
      mockCreateService.mockReturnValue({ id: "srv-new" });
      const formData = new FormData();
      formData.set("name", "My API Service");
      formData.set("type", "github");
      formData.set("repository", "org/repo");
      formData.set("branch", "main");
      formData.set("ports", JSON.stringify([{ external: 3000, internal: 3000 }]));
      formData.set("environmentVariables", JSON.stringify([{ key: "NODE_ENV", value: "production" }]));
      formData.set("volumes", JSON.stringify([{ name: "app-data", containerPath: "/data" }]));

      await createServiceAction("en", {}, formData);

      expect(mockCreateService).toHaveBeenCalledWith(expect.anything(), {
        name: "My API Service",
        type: "github",
        repository: "org/repo",
        branch: "main",
        ports: [{ external: 3000, internal: 3000 }],
        environmentVariables: [{ key: "NODE_ENV", value: "production" }],
        volumes: [{ name: "app-data", containerPath: "/data" }],
      });
      expect(mockUpdateTag).toHaveBeenCalledWith("getAllServices()");
      expect(mockRedirect).toHaveBeenCalledWith({ locale: "en", href: "/services" });
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
