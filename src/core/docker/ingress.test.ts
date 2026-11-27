import { beforeEach, describe, expect, it, vi } from "vitest";
import { removeIngressNetworks } from "./ingress";
import type Docker from "dockerode";

type FakeNetwork = {
  Id: string,
  Name: string,
  Labels?: Record<string, string>,
};

type FakeContainer = {
  Id: string,
  Labels: Record<string, string>,
  NetworkSettings: { Networks: Record<string, { NetworkID: string }> },
};

const mocks = vi.hoisted(() => ({
  listNetworks: vi.fn(),
  listContainers: vi.fn(),
  disconnect: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("~/core/docker", () => ({
  docker: {
    listNetworks: mocks.listNetworks,
    listContainers: mocks.listContainers,
    getNetwork: (id: string) => ({
      disconnect: (options: Docker.NetworkConnectOptions) => mocks.disconnect(id, options) as unknown,
      remove: () => mocks.remove(id) as unknown,
    }),
  },
}));

const dockerError = (statusCode: number) => Object.assign(new Error(`status ${statusCode}`), { statusCode });

let networks: FakeNetwork[] = [];
let containers: FakeContainer[] = [];

function addNetwork(name: string, labels: Record<string, string>) {
  networks.push({ Id: `id-of-${name}`, Name: name, Labels: labels });
}

function addContainer(id: string, labels: Record<string, string>, networkNames: string[]) {
  containers.push({
    Id: id,
    Labels: labels,
    NetworkSettings: {
      Networks: Object.fromEntries(networkNames.map(name => [name, { NetworkID: `id-of-${name}` }])),
    },
  });
}

const ingressLabels = (serviceId: string) => ({ "buttler.network": "ingress", "buttler.service-id": serviceId });
const getMembers = (name: string) => {
  return containers.filter(({ NetworkSettings }) => name in NetworkSettings.Networks).map(({ Id }) => Id);
};

beforeEach(() => {
  vi.resetAllMocks();
  networks = [];
  containers = [];
  mocks.listNetworks.mockImplementation((options?: { filters: { label: string[] } }) => {
    return Promise.resolve(networks.filter(network => (options?.filters.label ?? []).every(label => {
      const [key, value] = label.split("=");
      return network.Labels?.[key] === value;
    })));
  });
  mocks.listContainers.mockImplementation(() => Promise.resolve(containers));
  mocks.disconnect.mockImplementation((id: string, { Container }: Docker.NetworkConnectOptions) => {
    const name = networks.find(network => network.Id === id)?.Name ?? "";
    const container = containers.find(info => info.Id === Container);
    if (!container || !(name in container.NetworkSettings.Networks)) return Promise.reject(dockerError(404));
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

describe("removeIngressNetworks", () => {
  it("should disconnect the services and nginx, and remove the networks", async () => {
    addNetwork("buttler-ingress-srv", ingressLabels("srv"));
    addNetwork("buttler-ingress-api", ingressLabels("api"));
    addContainer("srv", { "buttler.service-id": "srv" }, ["buttler-internet-srv", "buttler-ingress-srv"]);
    addContainer("api", { "buttler.service-id": "api" }, ["buttler-ingress-api"]);
    addContainer("proxy", { "buttler.service-id": "proxy-service" }, ["buttler-ingress-srv", "buttler-ingress-api"]);
    await removeIngressNetworks();
    expect(networks).toEqual([]);
    expect(containers.map(({ NetworkSettings }) => Object.keys(NetworkSettings.Networks))).toEqual([
      ["buttler-internet-srv"],
      [],
      [],
    ]);
  });

  it("should never touch other networks", async () => {
    addNetwork("buttler-link-1", { "buttler.network": "link", "buttler.link-id": "1" });
    addNetwork("buttler-ingress-unlabelled", {});
    addContainer("srv", { "buttler.service-id": "srv" }, ["buttler-link-1", "buttler-ingress-unlabelled"]);
    await removeIngressNetworks();
    expect(networks.map(({ Name }) => Name)).toEqual(["buttler-link-1", "buttler-ingress-unlabelled"]);
    expect(mocks.listContainers).not.toHaveBeenCalled();
    expect(mocks.disconnect).not.toHaveBeenCalled();
  });

  it("should keep a network that a container from outside of Buttler uses", async () => {
    addNetwork("buttler-ingress-srv", ingressLabels("srv"));
    addContainer("srv", { "buttler.service-id": "srv" }, ["buttler-ingress-srv"]);
    addContainer("unrelated", {}, ["buttler-ingress-srv"]);
    await removeIngressNetworks();
    expect(networks.map(({ Name }) => Name)).toEqual(["buttler-ingress-srv"]);
    expect(getMembers("buttler-ingress-srv")).toEqual(["unrelated"]);
  });
});
