import os from "node:os";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { removeIngressNetwork, syncIngressNetwork, syncIngressNetworks } from "./ingress";
import type Docker from "dockerode";

type FakeNetwork = {
  Id: string,
  Name: string,
  Internal?: boolean,
  Labels?: Record<string, string>,
  IPAM?: { Config: { Subnet: string }[] },
};

type FakeContainer = {
  Id: string,
  Names: string[],
  State: string,
  Labels: Record<string, string>,
  NetworkSettings: { Networks: Record<string, { NetworkID: string, Aliases?: string[] }> },
};

const mocks = vi.hoisted(() => ({
  getServicesWithDomains: vi.fn(),
  listNetworks: vi.fn(),
  createNetwork: vi.fn(),
  listContainers: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("~/database", () => ({ default: {} }));
vi.mock("~/operations/getServicesWithDomains", () => ({ default: mocks.getServicesWithDomains }));
vi.mock("~/core/docker", () => ({
  docker: {
    listNetworks: mocks.listNetworks,
    createNetwork: mocks.createNetwork,
    listContainers: mocks.listContainers,
    getNetwork: (id: string) => ({
      connect: (options: Docker.NetworkConnectOptions) => mocks.connect(id, options) as unknown,
      disconnect: (options: Docker.NetworkConnectOptions) => mocks.disconnect(id, options) as unknown,
      remove: () => mocks.remove(id) as unknown,
    }),
  },
}));

const dockerError = (statusCode: number) => Object.assign(new Error(`status ${statusCode}`), { statusCode });

let networks: FakeNetwork[] = [];
let containers: FakeContainer[] = [];

function addContainer(id: string, name: string, labels: Record<string, string> = {}) {
  const container: FakeContainer = {
    Id: id,
    Names: [`/${name}`],
    State: "running",
    Labels: labels,
    NetworkSettings: { Networks: { bridge: { NetworkID: "bridge" } } },
  };
  containers.push(container);
  return container;
}

const addService = (id: string, container = id) => addContainer(container, `buttler-service-${id}`, { "buttler.service-id": id });
const addProxy = (id = "proxy") => addContainer(id, "buttler-nginx", { "buttler.service-id": "proxy-service" });
const setDomains = (...serviceIds: string[]) => void mocks.getServicesWithDomains.mockResolvedValue(serviceIds);
const getNetworkNames = () => networks.map(network => network.Name);
const getSubnets = () => networks.map(network => network.IPAM?.Config[0].Subnet);
const getMembers = (name: string) => containers.filter(({ NetworkSettings }) => name in NetworkSettings.Networks).map(({ Id }) => Id);

beforeEach(() => {
  vi.resetAllMocks();
  networks = [];
  containers = [];
  vi.spyOn(os, "networkInterfaces").mockReturnValue({});
  setDomains();
  mocks.listNetworks.mockImplementation((options?: { filters: { label: string[] } }) => {
    return Promise.resolve(networks.filter(network => (options?.filters.label ?? []).every(label => {
      const [key, value] = label.split("=");
      return network.Labels?.[key] === value;
    })));
  });
  mocks.createNetwork.mockImplementation((options: Omit<FakeNetwork, "Id">) => {
    const network = { ...options, Id: `id-of-${options.Name}` };
    networks.push(network);
    return Promise.resolve({ id: network.Id });
  });
  mocks.listContainers.mockImplementation(() => Promise.resolve(containers));
  mocks.connect.mockImplementation((id: string, { Container, EndpointConfig }: Docker.NetworkConnectOptions) => {
    const name = networks.find(network => network.Id === id)?.Name ?? "";
    const container = containers.find(info => info.Id === Container);
    if (!container || name in container.NetworkSettings.Networks) return Promise.reject(dockerError(403));
    container.NetworkSettings.Networks[name] = { NetworkID: id, Aliases: EndpointConfig?.Aliases };
    return Promise.resolve();
  });
  mocks.disconnect.mockImplementation((id: string, { Container }: Docker.NetworkConnectOptions) => {
    const name = networks.find(network => network.Id === id)?.Name ?? "";
    const container = containers.find(info => info.Id === Container);
    if (!container || !(name in container.NetworkSettings.Networks)) return Promise.reject(dockerError(403));
    delete container.NetworkSettings.Networks[name];
    return Promise.resolve();
  });
  mocks.remove.mockImplementation((id: string) => {
    const network = networks.find(({ Id }) => Id === id);
    if (!network) return Promise.reject(dockerError(404));
    if (getMembers(network.Name).length > 0) return Promise.reject(dockerError(403));
    networks = networks.filter(({ Id }) => Id !== id);
    return Promise.resolve();
  });
});

describe("syncIngressNetwork", () => {
  it("should connect the running containers after the first domain is added", async () => {
    const service = addService("srv");
    addService("other");
    addProxy();
    setDomains("srv");
    await syncIngressNetwork("srv");
    expect(networks).toEqual([expect.objectContaining({
      Name: "buttler-ingress-srv",
      Internal: true,
      IPAM: { Driver: "default", Config: [{ Subnet: "172.30.0.0/28" }] },
      Labels: expect.objectContaining({ "buttler.network": "ingress", "buttler.service-id": "srv" }),
    })]);
    expect(getMembers("buttler-ingress-srv")).toEqual(["srv", "proxy"]);
    expect(service.NetworkSettings.Networks["buttler-ingress-srv"].Aliases).toEqual(["service-srv"]);
    expect(service.NetworkSettings.Networks.bridge).toBeDefined();
  });

  it("should not change anything for the other domains", async () => {
    addService("srv");
    addProxy();
    setDomains("srv");
    await syncIngressNetwork("srv");
    await syncIngressNetwork("srv");
    expect(mocks.createNetwork).toHaveBeenCalledTimes(1);
    expect(mocks.connect).toHaveBeenCalledTimes(2);
  });

  it("should create the network of a stopped service, and connect its new container with the same alias", async () => {
    addProxy();
    setDomains("srv");
    await syncIngressNetwork("srv");
    expect(getMembers("buttler-ingress-srv")).toEqual(["proxy"]);
    const service = addService("srv", "redeployed");
    service.State = "created";
    await syncIngressNetwork("srv");
    expect(getMembers("buttler-ingress-srv")).toEqual(["proxy", "redeployed"]);
    expect(service.NetworkSettings.Networks["buttler-ingress-srv"].Aliases).toEqual(["service-srv"]);
  });

  it("should use a separate network with another subnet for each service", async () => {
    addService("a");
    addService("b");
    addProxy();
    setDomains("a", "b");
    await Promise.all([syncIngressNetwork("a"), syncIngressNetwork("b")]);
    expect(getMembers("buttler-ingress-a")).toEqual(["a", "proxy"]);
    expect(getMembers("buttler-ingress-b")).toEqual(["b", "proxy"]);
    expect(getSubnets()).toEqual(["172.30.0.0/28", "172.30.0.16/28"]);
  });

  it("should avoid the subnets of other networks and of the host", async () => {
    networks.push({ Id: "other", Name: "other", IPAM: { Config: [{ Subnet: "172.30.0.0/24" }] } });
    vi.mocked(os.networkInterfaces).mockReturnValue({
      eth0: [{ family: "IPv4", cidr: "172.30.1.5/28", address: "", netmask: "", mac: "", internal: false }],
    });
    setDomains("srv");
    await syncIngressNetwork("srv");
    expect(getSubnets()).toEqual(["172.30.0.0/24", "172.30.1.16/28"]);
  });

  it("should fail if there is no free subnet", async () => {
    networks.push({ Id: "other", Name: "other", IPAM: { Config: [{ Subnet: "172.30.0.0/16" }] } });
    setDomains("srv");
    await expect(syncIngressNetwork("srv")).rejects.toThrow("No free subnet");
  });

  it("should go on after a change that failed", async () => {
    setDomains("srv");
    mocks.createNetwork.mockRejectedValueOnce(dockerError(500));
    await expect(syncIngressNetwork("srv")).rejects.toThrow("status 500");
    await syncIngressNetwork("srv");
    expect(getNetworkNames()).toEqual(["buttler-ingress-srv"]);
  });

  it("should ignore the containers that are removed in the meantime", async () => {
    addService("srv");
    addProxy();
    setDomains("srv");
    mocks.connect.mockRejectedValueOnce(dockerError(404));
    await syncIngressNetwork("srv");
    expect(getMembers("buttler-ingress-srv")).toEqual(["proxy"]);
  });

  it("should fail if a container can't be connected", async () => {
    addService("srv");
    setDomains("srv");
    mocks.connect.mockRejectedValueOnce(dockerError(403));
    await expect(syncIngressNetwork("srv")).rejects.toThrow("status 403");
  });

  it("should not touch the containers that are created outside of Buttler", async () => {
    addContainer("unrelated", "srv");
    setDomains("srv");
    await syncIngressNetwork("srv");
    expect(mocks.connect).not.toHaveBeenCalled();
  });

  it("should remove the network after the last domain is removed", async () => {
    const service = addService("srv");
    addProxy();
    setDomains("srv");
    await syncIngressNetwork("srv");
    setDomains();
    await syncIngressNetwork("srv");
    expect(networks).toEqual([]);
    expect(Object.keys(service.NetworkSettings.Networks)).toEqual(["bridge"]);
  });

  it("should use the domains at the time of the change", async () => {
    addService("srv");
    setDomains("srv");
    const added = syncIngressNetwork("srv");
    setDomains();
    await Promise.all([added, syncIngressNetwork("srv")]);
    expect(networks).toEqual([]);
  });

  it("should never use or remove the networks that are created outside of Buttler", async () => {
    networks.push({ Id: "foreign", Name: "buttler-ingress-srv", Labels: { "buttler.service-id": "srv" } });
    await syncIngressNetwork("srv");
    expect(mocks.remove).not.toHaveBeenCalled();
    setDomains("srv");
    mocks.createNetwork.mockRejectedValueOnce(dockerError(409));
    await expect(syncIngressNetwork("srv")).rejects.toThrow("status 409");
    expect(mocks.connect).not.toHaveBeenCalled();
  });

  it("should keep the networks that are used by containers from outside of Buttler", async () => {
    setDomains("srv");
    await syncIngressNetwork("srv");
    const foreign = addContainer("foreign", "foreign");
    foreign.NetworkSettings.Networks["buttler-ingress-srv"] = { NetworkID: "id-of-buttler-ingress-srv" };
    setDomains();
    await expect(syncIngressNetwork("srv")).resolves.toBeUndefined();
    expect(getMembers("buttler-ingress-srv")).toEqual(["foreign"]);
  });
});

describe("syncIngressNetworks", () => {
  it("should connect a new Nginx container to all networks", async () => {
    addService("a");
    addService("b");
    addProxy("old");
    setDomains("a", "b");
    await syncIngressNetworks();
    containers = containers.filter(({ Id }) => Id !== "old");
    addProxy("new").State = "created";
    await syncIngressNetworks();
    expect(getMembers("buttler-ingress-a")).toEqual(["a", "new"]);
    expect(getMembers("buttler-ingress-b")).toEqual(["b", "new"]);
  });

  it("should remove the leftovers", async () => {
    setDomains("a", "b");
    await syncIngressNetworks();
    setDomains("b");
    await syncIngressNetworks();
    expect(getNetworkNames()).toEqual(["buttler-ingress-b"]);
  });

  it("should go on if a service fails", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    setDomains("a", "b");
    mocks.createNetwork.mockRejectedValueOnce(dockerError(500));
    await syncIngressNetworks();
    expect(log).toHaveBeenCalledTimes(1);
    expect(getNetworkNames()).toEqual(["buttler-ingress-b"]);
  });
});

describe("removeIngressNetwork", () => {
  it("should remove the network of a service that still has domains", async () => {
    addService("srv");
    addProxy();
    setDomains("srv", "other");
    await syncIngressNetworks();
    await removeIngressNetwork("srv");
    expect(getNetworkNames()).toEqual(["buttler-ingress-other"]);
  });

  it("should do nothing if it's already removed", async () => {
    await removeIngressNetwork("srv");
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it("should fail if Docker fails", async () => {
    setDomains("srv");
    await syncIngressNetwork("srv");
    mocks.remove.mockRejectedValueOnce(dockerError(500));
    await expect(removeIngressNetwork("srv")).rejects.toThrow("status 500");
  });
});
