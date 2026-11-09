import { beforeEach, describe, expect, it, vi } from "vitest";
import { restartService, startService, stopService } from "./service";

const mockGetService = vi.fn();
const mockStartServiceContainer = vi.fn();
const mockStopServiceContainer = vi.fn();
const mockRestartServiceContainer = vi.fn();
const mockRevalidatePath = vi.fn();

vi.mock("~/database", () => ({
  default: {},
}));

vi.mock("~/operations/getService", () => ({
  default: (...args: unknown[]) => mockGetService(...args),
}));

vi.mock("~/core/docker/status", () => ({
  startServiceContainer: (...args: unknown[]) => mockStartServiceContainer(...args),
  stopServiceContainer: (...args: unknown[]) => mockStopServiceContainer(...args),
  restartServiceContainer: (...args: unknown[]) => mockRestartServiceContainer(...args),
}));

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
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
});
