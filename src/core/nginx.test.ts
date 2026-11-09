import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  REVERSE_PROXY_CONTAINER_NAME,
  REVERSE_PROXY_IMAGE,
  ensureBaselineProxyConfig,
  getReverseProxyConfDir,
  getReverseProxyHealth,
  provisionReverseProxy,
  reloadReverseProxy,
} from "./nginx";

const mockContainer = {
  id: "test-container-id",
  inspect: vi.fn(),
  start: vi.fn(),
};

const mockImage = {
  inspect: vi.fn(),
};

const mockDocker = {
  getContainer: vi.fn(() => mockContainer),
  getImage: vi.fn(() => mockImage),
  createContainer: vi.fn(),
};

const mockPullImage = vi.fn();
const mockExecuteCommand = vi.fn();
const mockEnsureReverseProxyService = vi.fn();
const mockCheckFile = vi.fn();
const mockSaveFile = vi.fn();

vi.mock("./docker", () => ({
  docker: {
    getContainer: (name: string) => mockDocker.getContainer(name),
    getImage: (name: string) => mockDocker.getImage(name),
    createContainer: (...args: unknown[]) => mockDocker.createContainer(...args),
  },
  pullImage: (...args: unknown[]) => mockPullImage(...args),
  executeCommandInContainer: (...args: unknown[]) => mockExecuteCommand(...args),
}));

vi.mock("~/operations/ensureReverseProxyService", () => ({
  default: (...args: unknown[]) => mockEnsureReverseProxyService(...args),
}));

vi.mock("./storage", () => ({
  checkFile: (...args: unknown[]) => mockCheckFile(...args),
  saveFile: (...args: unknown[]) => mockSaveFile(...args),
  getFilePath: (_dir: string, file: string) => `/tmp/.buttler/nginx/conf.d/${file}`,
}));

describe("Reverse proxy system service management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ensureBaselineProxyConfig", () => {
    it("creates default.conf when not present", async () => {
      mockCheckFile.mockResolvedValue(false);
      mockSaveFile.mockResolvedValue("/tmp/.buttler/nginx/conf.d/default.conf");

      const dir = await ensureBaselineProxyConfig();
      expect(mockCheckFile).toHaveBeenCalledWith("nginx/conf.d", "default.conf");
      expect(mockSaveFile).toHaveBeenCalledWith("nginx/conf.d", "default.conf", expect.stringContaining("server {"));
      expect(dir).toBe(getReverseProxyConfDir());
    });

    it("skips writing default.conf if already exists", async () => {
      mockCheckFile.mockResolvedValue(true);

      const dir = await ensureBaselineProxyConfig();
      expect(mockCheckFile).toHaveBeenCalledWith("nginx/conf.d", "default.conf");
      expect(mockSaveFile).not.toHaveBeenCalled();
      expect(dir).toBe(getReverseProxyConfDir());
    });
  });

  describe("provisionReverseProxy", () => {
    it("starts container if it exists but is stopped", async () => {
      mockCheckFile.mockResolvedValue(true);
      mockContainer.inspect.mockResolvedValue({ State: { Running: false, Status: "exited" } });
      mockContainer.start.mockResolvedValue({});

      const result = await provisionReverseProxy();
      expect(mockEnsureReverseProxyService).toHaveBeenCalledTimes(1);
      expect(mockContainer.start).toHaveBeenCalledTimes(1);
      expect(result).toBe(mockContainer);
    });

    it("does not start container if already running", async () => {
      mockCheckFile.mockResolvedValue(true);
      mockContainer.inspect.mockResolvedValue({ State: { Running: true, Status: "running" } });

      const result = await provisionReverseProxy();
      expect(mockContainer.start).not.toHaveBeenCalled();
      expect(result).toBe(mockContainer);
    });

    it("creates and starts container if it does not exist (404)", async () => {
      mockCheckFile.mockResolvedValue(true);
      const notFoundError = new Error("No such container") as Error & { statusCode: number };
      notFoundError.statusCode = 404;
      mockContainer.inspect.mockRejectedValue(notFoundError);

      mockImage.inspect.mockRejectedValue(new Error("Image not found"));
      mockPullImage.mockResolvedValue({});

      const newContainer = {
        id: "new-container-id",
        start: vi.fn().mockResolvedValue({}),
      };
      mockDocker.createContainer.mockResolvedValue(newContainer);

      const result = await provisionReverseProxy();
      expect(mockPullImage).toHaveBeenCalledWith(REVERSE_PROXY_IMAGE);
      expect(mockDocker.createContainer).toHaveBeenCalledWith(expect.objectContaining({
        name: REVERSE_PROXY_CONTAINER_NAME,
        Image: REVERSE_PROXY_IMAGE,
        HostConfig: expect.objectContaining({
          PortBindings: {
            "80/tcp": [{ HostPort: "80" }],
            "443/tcp": [{ HostPort: "443" }],
          },
        }),
      }));
      expect(newContainer.start).toHaveBeenCalledTimes(1);
      expect(result).toBe(newContainer);
    });
  });

  describe("getReverseProxyHealth", () => {
    it("returns missing status when container is not found", async () => {
      const notFoundError = new Error("No such container") as Error & { statusCode: number };
      notFoundError.statusCode = 404;
      mockContainer.inspect.mockRejectedValue(notFoundError);

      const health = await getReverseProxyHealth();
      expect(health).toEqual({
        exists: false,
        running: false,
        status: "missing",
      });
    });

    it("returns health info when container is running", async () => {
      mockContainer.inspect.mockResolvedValue({
        State: { Running: true, Status: "running" },
      });
      mockExecuteCommand.mockResolvedValue("syntax is ok\ntest is successful");

      const health = await getReverseProxyHealth();
      expect(health).toEqual({
        exists: true,
        running: true,
        status: "running",
        containerId: "test-container-id",
        configValid: true,
      });
      expect(mockExecuteCommand).toHaveBeenCalledWith("test-container-id", ["nginx", "-t"]);
    });
  });

  describe("reloadReverseProxy", () => {
    it("executes reload command if container is running and syntax check passes", async () => {
      mockContainer.inspect.mockResolvedValue({
        State: { Running: true, Status: "running" },
      });
      mockExecuteCommand.mockImplementation((_id, cmd) => {
        if (cmd[1] === "-t") return Promise.resolve("syntax is ok");
        if (cmd[1] === "-s") return Promise.resolve("reloaded");
        return Promise.resolve("");
      });

      const res = await reloadReverseProxy();
      expect(res).toEqual({ success: true, output: "reloaded" });
      expect(mockExecuteCommand).toHaveBeenCalledWith("test-container-id", ["nginx", "-s", "reload"]);
    });

    it("throws if syntax test fails before reload", async () => {
      mockContainer.inspect.mockResolvedValue({
        State: { Running: true, Status: "running" },
      });
      mockExecuteCommand.mockResolvedValue("syntax error in line 12");

      await expect(reloadReverseProxy()).rejects.toThrow("Reverse proxy configuration test failed");
    });

    it("provisions container if not running when reload is called", async () => {
      mockContainer.inspect.mockResolvedValue({
        State: { Running: false, Status: "exited" },
      });
      mockContainer.start.mockResolvedValue({});
      mockCheckFile.mockResolvedValue(true);

      const res = await reloadReverseProxy();
      expect(res).toEqual({ success: true, output: "Reverse proxy provisioned and started" });
    });
  });
});
