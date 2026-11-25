import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  REVERSE_PROXY_CONTAINER_NAME,
  REVERSE_PROXY_IMAGE,
  deleteFromReverseProxy,
  getReverseProxyHealth,
  provisionReverseProxy,
  syncReverseProxyConfig,
} from "./nginx";

const mockContainer = {
  id: "test-container-id",
  inspect: vi.fn(),
  start: vi.fn(),
  remove: vi.fn(),
};

const mockImage = {
  inspect: vi.fn(),
};

const mockDocker = {
  getContainer: vi.fn((_name?: string) => mockContainer),
  getImage: vi.fn((_name?: string) => mockImage),
  createContainer: vi.fn(),
};

const mockPullImage = vi.fn();
const mockSyncIngressNetworks = vi.fn();
const mockConnectProxyToTunnel = vi.fn<() => Promise<void>>();
const mockExecuteCommand = vi.fn();
const mockEnsureReverseProxyService = vi.fn();
const mockGetDomains = vi.fn();
const mockGetDashboardDomain = vi.fn();

/** The content of default.conf, null if it doesn't exist */
let savedConfig: string | null = null;

vi.mock("./docker", () => ({
  docker: {
    getContainer: (name: string) => mockDocker.getContainer(name),
    getImage: (name: string) => mockDocker.getImage(name),
    createContainer: (...args: unknown[]) => mockDocker.createContainer(...args),
  },
  pullImage: (...args: unknown[]) => mockPullImage(...args),
  executeCommandInContainer: (...args: unknown[]) => mockExecuteCommand(...args),
}));

vi.mock("~/database", () => ({ default: {} }));

vi.mock("./docker/ingress", () => ({
  getIngressAlias: (serviceId: string) => `service-${serviceId}`,
  syncIngressNetworks: (...args: unknown[]) => mockSyncIngressNetworks(...args),
}));

vi.mock("./docker/tunnel", () => ({
  connectProxyToTunnel: () => mockConnectProxyToTunnel(),
}));

vi.mock("~/operations/ensureReverseProxyService", () => ({
  default: (...args: unknown[]) => mockEnsureReverseProxyService(...args),
}));

vi.mock("~/operations/getDashboardDomain", () => ({
  default: (...args: unknown[]) => mockGetDashboardDomain(...args),
}));

vi.mock("~/operations/getDomains", () => ({
  default: (...args: unknown[]) => mockGetDomains(...args),
}));

vi.mock("./storage", () => ({
  readFileContent: () => Promise.resolve(savedConfig),
  saveFile: (_dir: string, _file: string, content: string) => {
    savedConfig = content;
    return Promise.resolve();
  },
  removeFile: () => {
    savedConfig = null;
    return Promise.resolve();
  },
  getFilePath: (_dir: string, file: string) => `/tmp/.buttler/nginx/conf.d/${file}`,
}));

const notFoundError = Object.assign(new Error("No such container"), { statusCode: 404 });
const currentContainer = {
  Config: { Labels: { "buttler.service-id": "srv-proxy" } },
  HostConfig: { ExtraHosts: ["host.docker.internal:host-gateway"] },
};
const testCommand = [REVERSE_PROXY_CONTAINER_NAME, ["nginx", "-t"]];
const reloadCommand = [REVERSE_PROXY_CONTAINER_NAME, ["nginx", "-s", "reload"]];

describe("Reverse proxy system service management", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    savedConfig = null;
    mockDocker.getContainer.mockReturnValue(mockContainer);
    mockDocker.getImage.mockReturnValue(mockImage);
    mockGetDomains.mockResolvedValue([]);
    mockGetDashboardDomain.mockResolvedValue(null);
    mockExecuteCommand.mockResolvedValue({ exitCode: 0, output: "" });
    mockEnsureReverseProxyService.mockResolvedValue({
      id: "srv-proxy",
      name: "Reverse Proxy Server",
      type: "system",
    });
  });

  describe("provisionReverseProxy", () => {
    it("starts container if it exists but is stopped", async () => {
      mockContainer.inspect.mockResolvedValue({ ...currentContainer, State: { Running: false, Status: "exited" } });
      mockContainer.start.mockResolvedValue({});

      const result = await provisionReverseProxy();
      expect(mockEnsureReverseProxyService).toHaveBeenCalledTimes(1);
      expect(mockContainer.start).toHaveBeenCalledTimes(1);
      expect(mockSyncIngressNetworks).toHaveBeenCalledBefore(mockContainer.start);
      expect(result).toBe(mockContainer);
    });

    it("does not start container if already running", async () => {
      mockContainer.inspect.mockResolvedValue({ ...currentContainer, State: { Running: true, Status: "running" } });

      const result = await provisionReverseProxy();
      expect(mockContainer.start).not.toHaveBeenCalled();
      expect(mockSyncIngressNetworks).toHaveBeenCalledTimes(1);
      expect(result).toBe(mockContainer);
    });

    it("creates and starts container if it does not exist (404)", async () => {
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
        Labels: {
          "com.docker.compose.project": "buttler",
          "buttler.service-id": "srv-proxy",
        },
        HostConfig: expect.objectContaining({
          ExtraHosts: ["host.docker.internal:host-gateway"],
        }),
        Tty: false,
      }));
      const [[{ HostConfig: hostConfig }]] = mockDocker.createContainer.mock.calls as [[{ HostConfig: object }]];
      expect(hostConfig).not.toHaveProperty("PortBindings");
      expect(newContainer.start).toHaveBeenCalledTimes(1);
      expect(mockSyncIngressNetworks).toHaveBeenCalledAfter(mockDocker.createContainer);
      expect(mockSyncIngressNetworks).toHaveBeenCalledBefore(newContainer.start);
      expect(result).toBe(newContainer);
    });

    it("replaces the config of existing instances", async () => {
      savedConfig = "old config";
      mockGetDomains.mockResolvedValue([{ hostname: "app.example.com", serviceId: "a", port: 3000 }]);
      mockContainer.inspect.mockResolvedValue({ ...currentContainer, State: { Running: true } });
      await provisionReverseProxy();
      expect(savedConfig).toContain("server_name app.example.com;");
      expect(mockExecuteCommand.mock.calls).toEqual([testCommand, reloadCommand]);
    });

    it("generates the config before a stopped container is started", async () => {
      mockContainer.inspect.mockResolvedValue({ ...currentContainer, State: { Running: false } });
      mockContainer.start.mockImplementation(() => {
        expect(savedConfig).toContain("default_server");
      });
      await provisionReverseProxy();
      expect(mockContainer.start).toHaveBeenCalledTimes(1);
    });

    it("generates the config before the container is created", async () => {
      mockContainer.inspect.mockRejectedValue(notFoundError);
      mockDocker.createContainer.mockImplementation(() => {
        expect(savedConfig).toContain("default_server");
        return Promise.resolve({ start: vi.fn() });
      });
      await provisionReverseProxy();
      expect(mockDocker.createContainer).toHaveBeenCalledTimes(1);
    });

    it("connects the networks even if the config doesn't work", async () => {
      mockContainer.inspect.mockResolvedValue({ ...currentContainer, State: { Running: true } });
      mockExecuteCommand.mockResolvedValue({ exitCode: 1, output: "broken" });
      await expect(provisionReverseProxy()).rejects.toThrow("broken");
      expect(mockSyncIngressNetworks).toHaveBeenCalledTimes(1);
    });

    describe("with a container that can't reach the host", () => {
      const newContainer = { start: vi.fn() };

      beforeEach(() => {
        mockContainer.inspect.mockResolvedValueOnce({
          ...currentContainer,
          HostConfig: { ExtraHosts: null },
          State: { Running: true },
        }).mockRejectedValue(notFoundError);
        mockDocker.createContainer.mockResolvedValue(newContainer);
      });

      it("replaces the container", async () => {
        expect(await provisionReverseProxy()).toBe(newContainer);
        expect(mockContainer.remove).toHaveBeenCalledWith({ force: true });
        expect(mockContainer.remove).toHaveBeenCalledBefore(mockDocker.createContainer);
        expect(mockSyncIngressNetworks).toHaveBeenCalledBefore(newContainer.start);
      });

      it("keeps the container if the image can't be pulled", async () => {
        mockImage.inspect.mockRejectedValue(new Error("Image not found"));
        mockPullImage.mockRejectedValue(new Error("offline"));
        await expect(provisionReverseProxy()).rejects.toThrow("offline");
        expect(mockContainer.remove).not.toHaveBeenCalled();
      });
    });

    it("replaces a container that publishes its ports", async () => {
      mockContainer.inspect.mockResolvedValueOnce({
        ...currentContainer,
        HostConfig: { ...currentContainer.HostConfig, PortBindings: { "80/tcp": [{ HostPort: "80" }] } },
        State: { Running: true },
      }).mockRejectedValue(notFoundError);
      mockDocker.createContainer.mockResolvedValue({ start: vi.fn() });
      await provisionReverseProxy();
      expect(mockContainer.remove).toHaveBeenCalledWith({ force: true });
    });

    it("runs without the tunnel", async () => {
      vi.spyOn(console, "error").mockImplementation(() => undefined);
      mockContainer.inspect.mockResolvedValue({ ...currentContainer, State: { Running: false } });
      mockConnectProxyToTunnel.mockRejectedValue(new Error("no network"));
      await provisionReverseProxy();
      expect(mockContainer.start).toHaveBeenCalledTimes(1);
    });

    it("never replaces a container from outside of Buttler", async () => {
      mockContainer.inspect.mockResolvedValue({
        Config: { Labels: {} },
        HostConfig: {},
        State: { Running: true },
      });
      expect(await provisionReverseProxy()).toBe(mockContainer);
      expect(mockContainer.remove).not.toHaveBeenCalled();
    });
  });

  describe("getReverseProxyHealth", () => {
    it("returns missing status when container is not found", async () => {
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
      mockExecuteCommand.mockResolvedValue({ exitCode: 0, output: "syntax is ok" });

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

  describe("syncReverseProxyConfig", () => {
    beforeEach(() => {
      savedConfig = "old config";
      mockContainer.inspect.mockResolvedValue({ State: { Running: true } });
      mockGetDomains.mockResolvedValue([{ hostname: "app.example.com", serviceId: "a", port: 3000 }]);
    });

    it("tests the new config before Nginx is reloaded", async () => {
      await syncReverseProxyConfig();
      expect(savedConfig).toMatch(/server_name app\.example\.com;[^}]*"service-a:3000";/);
      expect(mockExecuteCommand.mock.calls).toEqual([testCommand, reloadCommand]);
    });

    describe("with a domain for the dashboard", () => {
      afterEach(() => {
        vi.unstubAllEnvs();
      });

      it.each([
        ["7777", 7777],
        ["", 3000],
      ])("proxies it to Buttler (PORT: \"%s\")", async (value, port) => {
        vi.stubEnv("PORT", value);
        mockGetDashboardDomain.mockResolvedValue("buttler.example.com");
        await syncReverseProxyConfig();
        expect(savedConfig).toContain("server_name buttler.example.com;");
        expect(savedConfig).toContain(`proxy_pass http://host.docker.internal:${port};`);
        expect(savedConfig).toContain("server_name app.example.com;");
      });
    });

    it("restores the previous config if the test fails", async () => {
      mockExecuteCommand.mockResolvedValue({ exitCode: 1, output: "unknown directive" });
      await expect(syncReverseProxyConfig()).rejects.toThrow("\"nginx -t\" failed: unknown directive");
      expect(savedConfig).toBe("old config");
      expect(mockExecuteCommand.mock.calls).toEqual([testCommand]);
    });

    it("restores the previous config if the test can't be run", async () => {
      mockExecuteCommand.mockRejectedValue(new Error("no docker"));
      await expect(syncReverseProxyConfig()).rejects.toThrow("no docker");
      expect(savedConfig).toBe("old config");
    });

    it("removes the new config if there is no previous one", async () => {
      savedConfig = null;
      mockExecuteCommand.mockResolvedValue({ exitCode: 1, output: "broken" });
      await expect(syncReverseProxyConfig()).rejects.toThrow("broken");
      expect(savedConfig).toBeNull();
    });

    it.each([
      ["stopped", { Running: false }],
      ["crashing", { Running: true, Restarting: true }],
    ])("only writes the config of a %s container", async (_, state) => {
      mockContainer.inspect.mockResolvedValue({ State: state });
      await syncReverseProxyConfig();
      expect(savedConfig).toContain("server_name app.example.com;");
      expect(mockExecuteCommand).not.toHaveBeenCalled();
      expect(mockContainer.start).not.toHaveBeenCalled();
    });

    it("only writes the config if there is no container", async () => {
      mockContainer.inspect.mockRejectedValue(notFoundError);
      await syncReverseProxyConfig();
      expect(savedConfig).toContain("server_name app.example.com;");
      expect(mockExecuteCommand).not.toHaveBeenCalled();
    });

    it("doesn't overlap other changes", async () => {
      const running: string[] = [];
      mockExecuteCommand.mockImplementation(async (_id, command: string[]) => {
        running.push(command[1]);
        await Promise.resolve();
        return { exitCode: 0, output: "" };
      });
      await Promise.all([syncReverseProxyConfig(), syncReverseProxyConfig()]);
      expect(running).toEqual(["-t", "-s", "-t", "-s"]);
    });
  });

  describe("deleteFromReverseProxy", () => {
    beforeEach(() => {
      savedConfig = "old config";
      mockContainer.inspect.mockResolvedValue({ State: { Running: true } });
      mockGetDomains.mockResolvedValue([
        { hostname: "app.example.com", serviceId: "a", port: 3000 },
        { hostname: "api.example.com", serviceId: "b", port: 8080 },
      ]);
    });

    it("stops serving the domains before the service is deleted", async () => {
      const isDeleted = await deleteFromReverseProxy("a", () => {
        expect(mockExecuteCommand.mock.calls).toEqual([testCommand, reloadCommand]);
        return Promise.resolve(true);
      });
      expect(isDeleted).toBe(true);
      expect(savedConfig).not.toContain("app.example.com");
      expect(savedConfig).toContain("api.example.com");
    });

    it("keeps serving the dashboard", async () => {
      mockGetDashboardDomain.mockResolvedValue("buttler.example.com");
      await deleteFromReverseProxy("a", () => Promise.resolve(true));
      expect(savedConfig).toContain("server_name buttler.example.com;");
    });

    it("keeps the service if the config doesn't work", async () => {
      const deleteService = vi.fn();
      mockExecuteCommand.mockResolvedValue({ exitCode: 1, output: "broken" });
      await expect(deleteFromReverseProxy("a", deleteService)).rejects.toThrow("broken");
      expect(deleteService).not.toHaveBeenCalled();
      expect(savedConfig).toBe("old config");
    });

    it("serves the domains of a service that is kept again", async () => {
      expect(await deleteFromReverseProxy("a", () => Promise.resolve(false))).toBe(false);
      expect(savedConfig).toContain("app.example.com");
    });

    it("serves the domains again if the service can't be deleted", async () => {
      const deleteService = () => Promise.reject(new Error("locked"));
      await expect(deleteFromReverseProxy("a", deleteService)).rejects.toThrow("locked");
      expect(savedConfig).toContain("app.example.com");
    });

    it("doesn't need Nginx for the services without a domain", async () => {
      expect(await deleteFromReverseProxy("c", () => Promise.resolve(true))).toBe(true);
      expect(savedConfig).toBe("old config");
      expect(mockContainer.inspect).not.toHaveBeenCalled();
    });
  });
});
