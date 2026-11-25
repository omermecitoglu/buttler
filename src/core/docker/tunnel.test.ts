import { beforeEach, describe, expect, it, vi } from "vitest";
import { connectProxyToTunnel, removeTunnelContainer, startTunnelContainer } from "./tunnel";

type FakeContainer = {
  Id: string,
  Names: string[],
  Labels: Record<string, string>,
  NetworkSettings: { Networks: Record<string, { NetworkID: string }> },
};

const mocks = vi.hoisted(() => ({
  listNetworks: vi.fn(),
  createNetwork: vi.fn(),
  listContainers: vi.fn(),
  createContainer: vi.fn(),
  inspectImage: vi.fn(),
  pullImage: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  removeNetwork: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("~/core/docker", () => ({
  pullImage: mocks.pullImage,
  docker: {
    listNetworks: mocks.listNetworks,
    createNetwork: mocks.createNetwork,
    listContainers: mocks.listContainers,
    createContainer: mocks.createContainer,
    getImage: () => ({ inspect: mocks.inspectImage }),
    getNetwork: () => ({ connect: mocks.connect, disconnect: mocks.disconnect, remove: mocks.removeNetwork }),
    getContainer: (id: string) => ({
      start: () => mocks.start(id),
      stop: () => mocks.stop(id),
      remove: () => mocks.remove(id),
    }),
  },
}));

const network = { Id: "net", Name: "buttler-tunnel" };
const options = { serviceId: "srv", tunnelId: "tunnel", token: "token" };
const labels = {
  "com.docker.compose.project": "buttler",
  "buttler.service-id": "srv",
  "buttler.tunnel-id": "tunnel",
};

function createFake(name: string, containerLabels: Record<string, string>, isConnected: boolean): FakeContainer {
  return {
    Id: name,
    Names: [`/${name}`],
    Labels: containerLabels,
    NetworkSettings: { Networks: isConnected ? { "buttler-tunnel": { NetworkID: "net" } } : {} },
  };
}

const proxy = (isConnected = false) => createFake("buttler-nginx", { "buttler.service-id": "proxy" }, isConnected);
const tunnel = (containerLabels: Record<string, string> = labels) => createFake("buttler-cloudflared", containerLabels, true);
const newContainer = { start: vi.fn() };

describe("tunnel container", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.listNetworks.mockResolvedValue([network]);
    mocks.createNetwork.mockResolvedValue({ id: "net" });
    mocks.listContainers.mockResolvedValue([proxy()]);
    mocks.createContainer.mockResolvedValue(newContainer);
  });

  it("should run cloudflared in a network that it only shares with Nginx", async () => {
    mocks.listNetworks.mockResolvedValueOnce([]);
    await startTunnelContainer(options);
    expect(mocks.createNetwork).toHaveBeenCalledWith({
      Name: "buttler-tunnel",
      Driver: "bridge",
      Labels: { "com.docker.compose.project": "buttler", "buttler.network": "tunnel" },
    });
    expect(mocks.connect).toHaveBeenCalledWith({ Container: "buttler-nginx" });
    expect(mocks.createContainer).toHaveBeenCalledWith({
      name: "buttler-cloudflared",
      Image: "cloudflare/cloudflared:latest",
      Cmd: ["tunnel", "--no-autoupdate", "run"],
      Env: ["TUNNEL_TOKEN=token"],
      Labels: labels,
      HostConfig: { NetworkMode: "buttler-tunnel", RestartPolicy: { Name: "always" } },
      Tty: false,
    });
    expect(newContainer.start).toHaveBeenCalledTimes(1);
  });

  it("should keep the container of the same tunnel", async () => {
    mocks.listContainers.mockResolvedValue([proxy(true), tunnel()]);
    await startTunnelContainer(options);
    expect(mocks.start).toHaveBeenCalledWith("buttler-cloudflared");
    expect(mocks.connect).not.toHaveBeenCalled();
    expect(mocks.createContainer).not.toHaveBeenCalled();
  });

  it("should ignore that the container is already running", async () => {
    mocks.listContainers.mockResolvedValue([tunnel()]);
    mocks.start.mockRejectedValue(Object.assign(new Error("running"), { statusCode: 304 }));
    await startTunnelContainer(options);
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it("should replace the container of another tunnel", async () => {
    mocks.listContainers.mockResolvedValue([tunnel({ ...labels, "buttler.tunnel-id": "old" })]);
    await startTunnelContainer(options);
    expect(mocks.remove).toHaveBeenCalledWith("buttler-cloudflared");
    expect(mocks.remove).toHaveBeenCalledBefore(mocks.createContainer);
  });

  it("should keep the old container if the image can't be pulled", async () => {
    mocks.listContainers.mockResolvedValue([tunnel({ ...labels, "buttler.tunnel-id": "old" })]);
    mocks.inspectImage.mockRejectedValue(new Error("no image"));
    mocks.pullImage.mockRejectedValue(new Error("offline"));
    await expect(startTunnelContainer(options)).rejects.toThrow("offline");
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it("should never touch a container from outside of Buttler", async () => {
    mocks.listContainers.mockResolvedValue([tunnel({})]);
    mocks.createContainer.mockRejectedValue(new Error("name is in use"));
    await expect(startTunnelContainer(options)).rejects.toThrow("name is in use");
    await removeTunnelContainer();
    expect(mocks.start).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it("should remove the container before the network", async () => {
    mocks.listContainers.mockResolvedValue([proxy(true), tunnel()]);
    await removeTunnelContainer();
    expect(mocks.remove).toHaveBeenCalledWith("buttler-cloudflared");
    expect(mocks.disconnect).toHaveBeenCalledWith({ Container: "buttler-nginx", Force: true });
    expect(mocks.removeNetwork).toHaveBeenCalledAfter(mocks.disconnect);
  });

  it("should keep a network that others use", async () => {
    mocks.removeNetwork.mockRejectedValue(Object.assign(new Error("active endpoints"), { statusCode: 403 }));
    await expect(removeTunnelContainer()).resolves.toBeUndefined();
  });

  it("should not connect Nginx without a tunnel", async () => {
    mocks.listNetworks.mockResolvedValue([]);
    await connectProxyToTunnel();
    expect(mocks.connect).not.toHaveBeenCalled();
  });
});
