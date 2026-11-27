import os from "node:os";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { connectLinkNetworks, removeLinkNetworks, syncLinkNetwork, syncLinkNetworks, syncReverseProxyLinks } from "./links";

type FakeNetwork = { Id: string, Name: string, Internal?: boolean, Labels?: Record<string, string> };
type FakeLink = { id: string, serviceAId: string, serviceBId: string };

const mocks = vi.hoisted(() => ({
  listNetworks: vi.fn(),
  createNetwork: vi.fn(),
  listContainers: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
  remove: vi.fn(),
  getServiceLinks: vi.fn(),
  updateReverseProxyLinks: vi.fn(),
}));

vi.mock("~/database", () => ({ default: {} }));
vi.mock("~/operations/getServiceLinks", () => ({ default: mocks.getServiceLinks }));
vi.mock("~/operations/syncReverseProxyLinks", () => ({ default: mocks.updateReverseProxyLinks }));
vi.mock("~/core/docker", () => ({
  docker: {
    listNetworks: mocks.listNetworks,
    createNetwork: mocks.createNetwork,
    listContainers: mocks.listContainers,
    getNetwork: (id: string) => ({
      connect: (options: unknown) => mocks.connect(id, options) as unknown,
      disconnect: (options: unknown) => mocks.disconnect(id, options) as unknown,
      remove: () => mocks.remove(id) as unknown,
    }),
  },
}));

const dockerError = (statusCode: number) => Object.assign(new Error(`status ${statusCode}`), { statusCode });

function container(id: string, serviceId: string | null, networkNames: string[] = []) {
  return {
    Id: id,
    Names: [`/${id}`],
    State: "running",
    Labels: serviceId ? { "buttler.service-id": serviceId } : {},
    NetworkSettings: {
      Networks: Object.fromEntries(networkNames.map(name => [name, { NetworkID: `id-${name}` }])),
    },
  };
}

function linkNetwork(linkId: string): FakeNetwork {
  const name = `buttler-link-${linkId}`;
  return { Id: `id-${name}`, Name: name, Labels: { "buttler.network": "link", "buttler.link-id": linkId } };
}

let networks: FakeNetwork[] = [];
let links: FakeLink[] = [];

beforeEach(() => {
  vi.resetAllMocks();
  networks = [];
  links = [];
  vi.spyOn(os, "networkInterfaces").mockReturnValue({});
  mocks.listContainers.mockResolvedValue([]);
  mocks.getServiceLinks.mockImplementation((_db: unknown, serviceId?: string) => {
    return Promise.resolve(links.filter(link => !serviceId || [link.serviceAId, link.serviceBId].includes(serviceId)));
  });
  mocks.listNetworks.mockImplementation((options?: { filters: { label: string[] } }) => {
    return Promise.resolve(networks.filter(network => (options?.filters.label ?? []).every(label => {
      const [key, value] = label.split("=");
      return network.Labels?.[key] === value;
    })));
  });
  mocks.createNetwork.mockImplementation((options: FakeNetwork) => {
    const network = { ...options, Id: `id-${options.Name}` };
    networks.push(network);
    return Promise.resolve({ id: network.Id });
  });
});

describe("syncLinkNetwork", () => {
  it("creates an internal network and connects the containers of both services", async () => {
    links = [{ id: "l1", serviceAId: "a", serviceBId: "b" }];
    mocks.listContainers.mockResolvedValue([container("ca", "a"), container("cb", "b"), container("cc", "c")]);
    await syncLinkNetwork("l1");
    expect(mocks.createNetwork).toHaveBeenCalledWith(expect.objectContaining({
      Name: "buttler-link-l1",
      Internal: true,
      Labels: expect.objectContaining({ "buttler.network": "link", "buttler.link-id": "l1" }),
    }));
    expect(mocks.connect.mock.calls).toEqual([
      ["id-buttler-link-l1", { Container: "ca" }],
      ["id-buttler-link-l1", { Container: "cb" }],
    ]);
  });

  it("doesn't connect the containers again", async () => {
    links = [{ id: "l1", serviceAId: "a", serviceBId: "b" }];
    networks = [linkNetwork("l1")];
    mocks.listContainers.mockResolvedValue([container("ca", "a", ["buttler-link-l1"])]);
    await syncLinkNetwork("l1");
    expect(mocks.createNetwork).not.toHaveBeenCalled();
    expect(mocks.connect).not.toHaveBeenCalled();
  });

  it("ignores a container that is replaced in the meantime", async () => {
    links = [{ id: "l1", serviceAId: "a", serviceBId: "b" }];
    mocks.listContainers.mockResolvedValue([container("ca", "a")]);
    mocks.connect.mockRejectedValue(dockerError(404));
    await expect(syncLinkNetwork("l1")).resolves.toBeUndefined();
  });

  it("removes the network of a link that is gone, and only disconnects the services", async () => {
    networks = [linkNetwork("l1")];
    mocks.listContainers.mockResolvedValue([
      container("ca", "a", ["buttler-link-l1"]),
      container("outside", null, ["buttler-link-l1"]),
    ]);
    mocks.remove.mockRejectedValue(dockerError(403));
    await expect(syncLinkNetwork("l1")).resolves.toBeUndefined();
    expect(mocks.disconnect.mock.calls).toEqual([["id-buttler-link-l1", { Container: "ca", Force: true }]]);
    expect(mocks.remove).toHaveBeenCalledWith("id-buttler-link-l1");
  });
});

describe("syncReverseProxyLinks", () => {
  it("syncs the networks of the links that nginx has or had with the service", async () => {
    links = [{ id: "l1", serviceAId: "a", serviceBId: "proxy" }];
    networks = [linkNetwork("l2")];
    mocks.updateReverseProxyLinks.mockReturnValue(["l1", "l2"]);
    mocks.listContainers.mockResolvedValue([
      container("ca", "a"),
      container("nginx", "proxy", ["buttler-link-l2"]),
    ]);
    await syncReverseProxyLinks("a");
    expect(mocks.updateReverseProxyLinks).toHaveBeenCalledWith({}, "a");
    expect(mocks.connect.mock.calls).toEqual([
      ["id-buttler-link-l1", { Container: "ca" }],
      ["id-buttler-link-l1", { Container: "nginx" }],
    ]);
    expect(mocks.disconnect.mock.calls).toEqual([["id-buttler-link-l2", { Container: "nginx", Force: true }]]);
    expect(networks.map(network => network.Name)).toEqual(["buttler-link-l2", "buttler-link-l1"]);
  });

  it("fails if the network of the service can't be set up", async () => {
    links = [{ id: "l1", serviceAId: "a", serviceBId: "proxy" }];
    mocks.updateReverseProxyLinks.mockReturnValue(["l1"]);
    mocks.createNetwork.mockRejectedValue(new Error("no free subnet"));
    await expect(syncReverseProxyLinks("a")).rejects.toThrow("no free subnet");
  });

  it("goes on after a link that failed, when all services are synced", async () => {
    links = [{ id: "l1", serviceAId: "a", serviceBId: "proxy" }, { id: "l2", serviceAId: "b", serviceBId: "proxy" }];
    mocks.updateReverseProxyLinks.mockReturnValue(["l1", "l2"]);
    mocks.createNetwork.mockRejectedValueOnce(new Error("no free subnet"));
    const logError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await syncReverseProxyLinks();
    expect(mocks.updateReverseProxyLinks).toHaveBeenCalledWith({}, undefined);
    expect(mocks.createNetwork).toHaveBeenCalledTimes(2);
    expect(logError).toHaveBeenCalledTimes(1);
  });
});

describe("connectLinkNetworks", () => {
  it("connects the container of a service to all of its links", async () => {
    links = [
      { id: "l1", serviceAId: "a", serviceBId: "b" },
      { id: "l2", serviceAId: "a", serviceBId: "c" },
      { id: "l3", serviceAId: "b", serviceBId: "c" },
    ];
    mocks.listContainers.mockResolvedValue([container("ca", "a")]);
    await connectLinkNetworks("a");
    expect(networks.map(network => network.Name)).toEqual(["buttler-link-l1", "buttler-link-l2"]);
    expect(mocks.connect.mock.calls).toEqual([
      ["id-buttler-link-l1", { Container: "ca" }],
      ["id-buttler-link-l2", { Container: "ca" }],
    ]);
  });
});

describe("removeLinkNetworks", () => {
  it("removes the networks of the links of a service", async () => {
    links = [{ id: "l1", serviceAId: "a", serviceBId: "b" }, { id: "l2", serviceAId: "b", serviceBId: "c" }];
    networks = [linkNetwork("l1"), linkNetwork("l2")];
    mocks.listContainers.mockResolvedValue([container("cb", "b", ["buttler-link-l1", "buttler-link-l2"])]);
    await removeLinkNetworks("a");
    expect(mocks.disconnect.mock.calls).toEqual([["id-buttler-link-l1", { Container: "cb", Force: true }]]);
    expect(mocks.remove.mock.calls).toEqual([["id-buttler-link-l1"]]);
  });
});

describe("syncLinkNetworks", () => {
  it("connects every link and removes the leftovers, a failure doesn't stop the others", async () => {
    links = [{ id: "l1", serviceAId: "a", serviceBId: "b" }, { id: "l2", serviceAId: "b", serviceBId: "c" }];
    networks = [linkNetwork("gone")];
    mocks.listContainers.mockResolvedValue([container("ca", "a"), container("cc", "c")]);
    mocks.connect.mockRejectedValueOnce(new Error("boom"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    await syncLinkNetworks();
    expect(mocks.connect.mock.calls).toEqual([
      ["id-buttler-link-l1", { Container: "ca" }],
      ["id-buttler-link-l2", { Container: "cc" }],
    ]);
    expect(mocks.remove).toHaveBeenCalledWith("id-buttler-link-gone");
  });
});
