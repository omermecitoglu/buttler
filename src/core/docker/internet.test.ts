import os from "node:os";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ensureServiceNetwork, removeServiceNetworks } from "./internet";

type FakeNetwork = { Id: string, Name: string, Internal?: boolean, Labels?: Record<string, string> };

const mocks = vi.hoisted(() => ({
  listNetworks: vi.fn(),
  createNetwork: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("~/core/docker", () => ({
  docker: {
    listNetworks: mocks.listNetworks,
    createNetwork: mocks.createNetwork,
    getNetwork: (id: string) => ({
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

describe("ensureServiceNetwork", () => {
  it("creates a network that reaches the outside for a service with internet access", async () => {
    await expect(ensureServiceNetwork("a", true)).resolves.toBe("buttler-internet-a");
    expect(mocks.createNetwork).toHaveBeenCalledWith(expect.objectContaining({
      Name: "buttler-internet-a",
      Driver: "bridge",
      Internal: false,
      Labels: expect.objectContaining({ "buttler.network": "internet", "buttler.service-id": "a" }),
    }));
  });

  it("creates an internal network for a service without internet access", async () => {
    await expect(ensureServiceNetwork("a", false)).resolves.toBe("buttler-isolated-a");
    expect(mocks.createNetwork).toHaveBeenCalledWith(expect.objectContaining({
      Name: "buttler-isolated-a",
      Driver: "bridge",
      Internal: true,
      Labels: expect.objectContaining({ "buttler.network": "isolated", "buttler.service-id": "a" }),
    }));
  });

  it("reuses the network of the service", async () => {
    await Promise.all([ensureServiceNetwork("a", false), ensureServiceNetwork("a", false)]);
    expect(mocks.createNetwork).toHaveBeenCalledTimes(1);
  });

  it("never uses a network that isn't labelled by Buttler", async () => {
    networks.push({ Id: "foreign", Name: "buttler-internet-a" });
    await ensureServiceNetwork("a", true);
    expect(mocks.createNetwork).toHaveBeenCalledTimes(1);
  });
});

describe("removeServiceNetworks", () => {
  it("removes both networks of the service", async () => {
    await ensureServiceNetwork("a", true);
    await ensureServiceNetwork("a", false);
    await removeServiceNetworks("a");
    expect(mocks.remove.mock.calls).toEqual([["id-buttler-internet-a"], ["id-buttler-isolated-a"]]);
  });

  it.each([
    [true, "id-buttler-isolated-a"],
    [false, "id-buttler-internet-a"],
  ])("keeps the network that matches the internet access (%s)", async (internetAccess, removed) => {
    await ensureServiceNetwork("a", true);
    await ensureServiceNetwork("a", false);
    await removeServiceNetworks("a", internetAccess);
    expect(mocks.remove.mock.calls).toEqual([[removed]]);
  });

  it("keeps a network that is still in use", async () => {
    await ensureServiceNetwork("a", true);
    mocks.remove.mockRejectedValue(dockerError(403));
    await expect(removeServiceNetworks("a")).resolves.toBeUndefined();
  });

  it("does nothing without a network", async () => {
    await removeServiceNetworks("a");
    expect(mocks.remove).not.toHaveBeenCalled();
  });
});
