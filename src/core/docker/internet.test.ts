import os from "node:os";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ensureInternetNetwork, removeInternetNetwork } from "./internet";

type FakeNetwork = { Id: string, Name: string, Internal?: boolean, Labels?: Record<string, string> };

const mocks = vi.hoisted(() => ({
  listNetworks: vi.fn(),
  createNetwork: vi.fn(),
  disconnect: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("~/core/docker", () => ({
  docker: {
    listNetworks: mocks.listNetworks,
    createNetwork: mocks.createNetwork,
    getNetwork: (id: string) => ({
      disconnect: (options: unknown) => mocks.disconnect(id, options) as unknown,
      remove: () => mocks.remove(id) as unknown,
    }),
  },
}));

const dockerError = (statusCode: number) => Object.assign(new Error(`status ${statusCode}`), { statusCode });

let networks: FakeNetwork[] = [];

beforeEach(() => {
  vi.resetAllMocks();
  networks = [];
  vi.spyOn(os, "networkInterfaces").mockReturnValue({});
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

describe("ensureInternetNetwork", () => {
  it("creates a network that reaches the outside for the service", async () => {
    await expect(ensureInternetNetwork("a")).resolves.toBe("buttler-internet-a");
    expect(mocks.createNetwork).toHaveBeenCalledWith(expect.objectContaining({
      Name: "buttler-internet-a",
      Driver: "bridge",
      Labels: expect.objectContaining({ "buttler.network": "internet", "buttler.service-id": "a" }),
    }));
    expect(networks[0].Internal).toBeUndefined();
  });

  it("reuses the network of the service", async () => {
    await Promise.all([ensureInternetNetwork("a"), ensureInternetNetwork("a")]);
    expect(mocks.createNetwork).toHaveBeenCalledTimes(1);
  });

  it("never uses a network that isn't labelled by Buttler", async () => {
    networks.push({ Id: "foreign", Name: "buttler-internet-a" });
    await ensureInternetNetwork("a");
    expect(mocks.createNetwork).toHaveBeenCalledTimes(1);
  });
});

describe("removeInternetNetwork", () => {
  it("disconnects the container and removes the network", async () => {
    await ensureInternetNetwork("a");
    await removeInternetNetwork("a", "container");
    expect(mocks.disconnect).toHaveBeenCalledWith("id-buttler-internet-a", { Container: "container", Force: true });
    expect(mocks.remove).toHaveBeenCalledWith("id-buttler-internet-a");
  });

  it("keeps a network that is still in use", async () => {
    await ensureInternetNetwork("a");
    mocks.remove.mockRejectedValue(dockerError(403));
    await expect(removeInternetNetwork("a")).resolves.toBeUndefined();
    expect(mocks.disconnect).not.toHaveBeenCalled();
  });

  it("does nothing without a network", async () => {
    await removeInternetNetwork("a", "container");
    expect(mocks.remove).not.toHaveBeenCalled();
  });
});
