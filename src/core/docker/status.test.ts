import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  BUTTLER_SERVICE_LABEL,
  createServiceRuntimeState,
  extractContainerIpAddresses,
  extractContainerPorts,
  findServiceContainer,
  formatContainerUptime,
  getServiceRuntimeState,
  getServicesRuntimeStates,
  isServiceBuilding,
  isServicePulling,
  markServiceBuilding,
  markServicePulling,
  matchContainerForService,
  parseContainerRuntimeStatus,
  restartServiceContainer,
  startServiceContainer,
  stopServiceContainer,
} from "./status";
import type Docker from "dockerode";

const mockContainer = {
  start: vi.fn(),
  stop: vi.fn(),
  restart: vi.fn(),
  remove: vi.fn(),
};

const mockImage = {
  inspect: vi.fn(),
};

const mockDocker = {
  listContainers: vi.fn(),
  getContainer: vi.fn((_id: string) => mockContainer),
  createContainer: vi.fn().mockResolvedValue(mockContainer),
  createVolume: vi.fn().mockResolvedValue({}),
  getImage: vi.fn((_name: string) => mockImage),
};

const mockPullImage = vi.fn();
const mockProvisionReverseProxy = vi.fn();

vi.mock("~/core/docker", () => ({
  docker: {
    listContainers: (...args: unknown[]) => mockDocker.listContainers(...args),
    getContainer: (...args: unknown[]) => mockDocker.getContainer(...args as [string]),
    createContainer: (...args: unknown[]) => mockDocker.createContainer(...args),
    createVolume: (...args: unknown[]) => mockDocker.createVolume(...args),
    getImage: (...args: unknown[]) => mockDocker.getImage(...args as [string]),
  },
  pullImage: (...args: unknown[]) => mockPullImage(...args),
}));

vi.mock("~/core/nginx", () => ({
  provisionReverseProxy: (...args: unknown[]) => mockProvisionReverseProxy(...args),
}));

describe("Docker status aggregator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    markServiceBuilding("srv-building", false);
    markServiceBuilding("srv-b", false);
    markServicePulling("srv-pulling", false);
    markServicePulling("srv-p", false);
  });

  describe("Building tracker", () => {
    it("tracks building status accurately", () => {
      expect(isServiceBuilding("srv-1")).toBe(false);
      markServiceBuilding("srv-1", true);
      expect(isServiceBuilding("srv-1")).toBe(true);
      markServiceBuilding("srv-1", false);
      expect(isServiceBuilding("srv-1")).toBe(false);
    });
  });

  describe("Pulling tracker", () => {
    it("tracks pulling status accurately", () => {
      expect(isServicePulling("srv-1")).toBe(false);
      markServicePulling("srv-1", true);
      expect(isServicePulling("srv-1")).toBe(true);
      markServicePulling("srv-1", false);
      expect(isServicePulling("srv-1")).toBe(false);
    });
  });

  describe("parseContainerRuntimeStatus", () => {
    it("returns stopped when container is undefined", () => {
      expect(parseContainerRuntimeStatus(undefined)).toBe("stopped");
    });

    it("returns running for running state", () => {
      expect(parseContainerRuntimeStatus({ State: "running" } as Docker.ContainerInfo)).toBe("running");
    });

    it("returns restarting for restarting state", () => {
      expect(parseContainerRuntimeStatus({ State: "restarting" } as Docker.ContainerInfo)).toBe("restarting");
    });

    it("returns stopped for created or paused state", () => {
      expect(parseContainerRuntimeStatus({ State: "created" } as Docker.ContainerInfo)).toBe("stopped");
      expect(parseContainerRuntimeStatus({ State: "paused" } as Docker.ContainerInfo)).toBe("stopped");
    });

    it("returns stopped for exited (0) status", () => {
      expect(parseContainerRuntimeStatus({
        State: "exited",
        Status: "Exited (0) 5 minutes ago",
      } as Docker.ContainerInfo)).toBe("stopped");
    });

    it("returns exited for crashed/non-zero exit code", () => {
      expect(parseContainerRuntimeStatus({
        State: "exited",
        Status: "Exited (1) 2 minutes ago",
      } as Docker.ContainerInfo)).toBe("exited");
      expect(parseContainerRuntimeStatus({
        State: "dead",
        Status: "Dead",
      } as Docker.ContainerInfo)).toBe("exited");
    });
  });

  describe("formatContainerUptime", () => {
    it("extracts clean uptime string", () => {
      expect(formatContainerUptime("Up 2 hours (healthy)")).toBe("Up 2 hours");
      expect(formatContainerUptime("Up 45 minutes")).toBe("Up 45 minutes");
      expect(formatContainerUptime("Exited (0) 10 minutes ago")).toBeNull();
      expect(formatContainerUptime(undefined)).toBeNull();
    });
  });

  describe("extractContainerPorts & IP addresses", () => {
    it("extracts port bindings", () => {
      expect(extractContainerPorts(undefined)).toEqual([]);
      const ports = extractContainerPorts({
        Ports: [
          { IP: "0.0.0.0", PrivatePort: 80, PublicPort: 8080, Type: "tcp" },
          { PrivatePort: 443, Type: "tcp" },
        ],
      } as Docker.ContainerInfo);
      expect(ports).toEqual([
        { external: 8080, internal: 80, type: "tcp", hostIp: "0.0.0.0" },
        { external: undefined, internal: 443, type: "tcp", hostIp: undefined },
      ]);
    });

    it("extracts IP addresses from network settings", () => {
      expect(extractContainerIpAddresses(undefined)).toEqual([]);
      const ips = extractContainerIpAddresses({
        NetworkSettings: {
          Networks: {
            bridge: { IPAddress: "172.17.0.2" },
            custom: { IPAddress: "172.18.0.3" },
          },
        },
      } as unknown as Docker.ContainerInfo);
      expect(ips).toEqual(["172.17.0.2", "172.18.0.3"]);
    });
  });

  describe("matchContainerForService", () => {
    const containers = [
      {
        Id: "c-1",
        Names: ["/my-app"],
        Labels: { [BUTTLER_SERVICE_LABEL]: "srv-1" },
      },
      {
        Id: "c-nginx",
        Names: ["/buttler-nginx"],
        Labels: {},
      },
      {
        Id: "c-2",
        Names: ["/named-app"],
        Labels: {},
      },
    ] as unknown as Docker.ContainerInfo[];

    it("matches by label", () => {
      const matched = matchContainerForService({ id: "srv-1", name: "Different Name" }, containers);
      expect(matched?.Id).toBe("c-1");
    });

    it("matches reverse proxy by system type and name", () => {
      const matched = matchContainerForService({
        id: "srv-proxy",
        type: "system",
        name: "Reverse Proxy Server",
      }, containers);
      expect(matched?.Id).toBe("c-nginx");
    });

    it("matches by container name fallback", () => {
      const matched = matchContainerForService({ id: "srv-unlabeled", name: "named-app" }, containers);
      expect(matched?.Id).toBe("c-2");
    });

    it("returns undefined if no match", () => {
      const matched = matchContainerForService({ id: "srv-unknown", name: "non-existent" }, containers);
      expect(matched).toBeUndefined();
    });
  });

  describe("createServiceRuntimeState", () => {
    it("creates state for pulling service", () => {
      markServicePulling("srv-p", true);
      const state = createServiceRuntimeState("srv-p", { Id: "c-p", Names: ["/pull"] } as Docker.ContainerInfo);
      expect(state.status).toBe("pulling");
      expect(state.containerId).toBe("c-p");
      expect(state.containerName).toBe("pull");
    });

    it("creates state for building service", () => {
      markServiceBuilding("srv-b", true);
      const state = createServiceRuntimeState("srv-b", { Id: "c-b", Names: ["/build"] } as Docker.ContainerInfo);
      expect(state.status).toBe("building");
      expect(state.containerId).toBe("c-b");
      expect(state.containerName).toBe("build");
    });

    it("creates default state when container is null", () => {
      const state = createServiceRuntimeState("srv-none");
      expect(state.status).toBe("stopped");
      expect(state.containerId).toBeNull();
      expect(state.containerName).toBeNull();
      expect(state.ports).toEqual([]);
    });

    it("creates state from live container info", () => {
      const state = createServiceRuntimeState("srv-live", {
        Id: "c-live",
        Names: ["/live-service"],
        State: "running",
        Status: "Up 3 hours",
        Ports: [{ PrivatePort: 3000, PublicPort: 80, Type: "tcp", IP: "0.0.0.0" }],
        NetworkSettings: { Networks: { bridge: { IPAddress: "172.17.0.5" } } },
      } as unknown as Docker.ContainerInfo);

      expect(state.status).toBe("running");
      expect(state.containerId).toBe("c-live");
      expect(state.containerName).toBe("live-service");
      expect(state.uptime).toBe("Up 3 hours");
      expect(state.ports).toEqual([{ external: 80, internal: 3000, type: "tcp", hostIp: "0.0.0.0" }]);
      expect(state.ipAddresses).toEqual(["172.17.0.5"]);
    });
  });

  describe("getServicesRuntimeStates & getServiceRuntimeState", () => {
    it("aggregates multiple services states correctly", async () => {
      mockDocker.listContainers.mockResolvedValue([
        {
          Id: "c-1",
          Names: ["/service-one"],
          State: "running",
          Status: "Up 10 minutes",
          Labels: { [BUTTLER_SERVICE_LABEL]: "srv-1" },
        },
      ]);

      const result = await getServicesRuntimeStates([
        { id: "srv-1", name: "Service One" },
        { id: "srv-2", name: "Service Two" },
      ]);

      expect(result["srv-1"].status).toBe("running");
      expect(result["srv-1"].containerId).toBe("c-1");
      expect(result["srv-2"].status).toBe("stopped");
      expect(result["srv-2"].containerId).toBeNull();
    });

    it("handles Docker error gracefully and returns default states", async () => {
      mockDocker.listContainers.mockRejectedValue(new Error("Docker daemon unavailable"));

      const result = await getServicesRuntimeStates([
        { id: "srv-1", name: "Service One" },
      ]);

      expect(result["srv-1"].status).toBe("stopped");
      expect(result["srv-1"].containerId).toBeNull();
    });

    it("getServiceRuntimeState returns state for single service", async () => {
      mockDocker.listContainers.mockResolvedValue([]);
      const state = await getServiceRuntimeState({ id: "srv-single" });
      expect(state.status).toBe("stopped");
    });
  });

  describe("Lifecycle actions: findServiceContainer, start, stop, restart", () => {
    it("findServiceContainer returns container if found or null", async () => {
      mockDocker.listContainers.mockResolvedValue([
        { Id: "c-find", Names: ["/finder"], Labels: { [BUTTLER_SERVICE_LABEL]: "srv-f" } },
      ]);

      const found = await findServiceContainer({ id: "srv-f" });
      expect(found).toBe(mockContainer);
      expect(mockDocker.getContainer).toHaveBeenCalledWith("c-find");

      const notFound = await findServiceContainer({ id: "srv-other" });
      expect(notFound).toBeNull();
    });

    it("findServiceContainer returns null on docker error", async () => {
      mockDocker.listContainers.mockRejectedValue(new Error("fail"));
      const found = await findServiceContainer({ id: "srv-err" });
      expect(found).toBeNull();
    });

    it("startServiceContainer starts found container for custom non-dockerhub service", async () => {
      mockDocker.listContainers.mockResolvedValue([
        { Id: "c-start", Labels: { [BUTTLER_SERVICE_LABEL]: "srv-s" } },
      ]);
      await startServiceContainer({ id: "srv-s", type: "custom" });
      expect(mockContainer.start).toHaveBeenCalled();
    });

    it("startServiceContainer provisions reverse proxy if system service", async () => {
      mockDocker.listContainers.mockResolvedValue([]);
      await startServiceContainer({ id: "srv-proxy", type: "system", name: "Reverse Proxy Server" });
      expect(mockProvisionReverseProxy).toHaveBeenCalled();
    });

    it("startServiceContainer creates and starts container for dockerhub service", async () => {
      mockDocker.listContainers.mockResolvedValue([]);
      mockImage.inspect.mockResolvedValue({});
      await startServiceContainer({
        id: "srv-dh",
        type: "dockerhub",
        repository: "redis",
        branch: "alpine",
        ports: [{ external: 6379, internal: 6379 }],
        environmentVariables: [{ key: "A", value: "B" }],
        volumes: [{ name: "vol1", containerPath: "/data" }],
      });
      expect(mockDocker.createVolume).toHaveBeenCalledWith({ Name: "vol1" });
      expect(mockDocker.createContainer).toHaveBeenCalledWith(expect.objectContaining({
        name: "buttler-service-srv-dh",
        Image: "redis:alpine",
        Labels: expect.objectContaining({
          [BUTTLER_SERVICE_LABEL]: "srv-dh",
        }),
      }));
      expect(mockContainer.start).toHaveBeenCalled();
    });

    it("startServiceContainer pulls image if not present locally", async () => {
      mockDocker.listContainers.mockResolvedValue([]);
      mockImage.inspect.mockRejectedValueOnce({ statusCode: 404 });
      mockPullImage.mockResolvedValue({});
      await startServiceContainer({
        id: "srv-pull",
        type: "dockerhub",
        repository: "postgres",
        branch: "15",
      });
      expect(mockPullImage).toHaveBeenCalledWith("postgres:15");
      expect(mockContainer.start).toHaveBeenCalled();
    });

    it("startServiceContainer throws if no image specified for dockerhub service", async () => {
      await expect(startServiceContainer({ id: "srv-empty", type: "dockerhub", repository: "" }))
        .rejects.toThrow("No Docker Hub image specified for service srv-empty");
    });

    it("startServiceContainer throws for github service", async () => {
      await expect(startServiceContainer({ id: "srv-gh", type: "github" }))
        .rejects.toThrow("GitHub build pipeline is not yet implemented");
    });

    it("startServiceContainer throws if non-dockerhub container not found", async () => {
      mockDocker.listContainers.mockResolvedValue([]);
      await expect(startServiceContainer({ id: "srv-none", type: "custom" }))
        .rejects.toThrow("No container found for service srv-none");
    });

    it("stopServiceContainer stops and removes found container", async () => {
      mockDocker.listContainers.mockResolvedValue([
        { Id: "c-stop", Labels: { [BUTTLER_SERVICE_LABEL]: "srv-stop" } },
      ]);
      await stopServiceContainer({ id: "srv-stop" });
      expect(mockContainer.stop).toHaveBeenCalledWith({ t: 10 });
      expect(mockContainer.remove).toHaveBeenCalledWith({ force: true });
    });

    it("stopServiceContainer is a no-op if container not found", async () => {
      mockDocker.listContainers.mockResolvedValue([]);
      await expect(stopServiceContainer({ id: "srv-none" })).resolves.not.toThrow();
    });

    it("restartServiceContainer provisions reverse proxy if system service", async () => {
      mockDocker.listContainers.mockResolvedValue([]);
      await restartServiceContainer({ id: "srv-proxy", type: "system", name: "Reverse Proxy Server" });
      expect(mockProvisionReverseProxy).toHaveBeenCalled();
    });

    it("restartServiceContainer restarts container by stopping and starting", async () => {
      mockDocker.listContainers.mockResolvedValue([
        { Id: "c-restart", Labels: { [BUTTLER_SERVICE_LABEL]: "srv-r" } },
      ]);
      mockImage.inspect.mockResolvedValue({});
      await restartServiceContainer({
        id: "srv-r",
        type: "dockerhub",
        repository: "redis",
      });
      expect(mockContainer.stop).toHaveBeenCalled();
      expect(mockContainer.remove).toHaveBeenCalled();
      expect(mockDocker.createContainer).toHaveBeenCalled();
      expect(mockContainer.start).toHaveBeenCalled();
    });
  });
});
