import os from "node:os";
import { docker } from "~/core/docker";
import { createQueue } from "~/core/queue";
import { findFreeSubnet } from "./subnets";
import type Docker from "dockerode";

/** Outside of the default pools of Docker (172.17.0.0/12, 192.168.0.0/16) and of common LANs */
const BUTTLER_SUBNET_RANGE = "10.213.0.0/16";

/** Enough for 2 containers, their replacements while they are deployed and the gateway */
const BUTTLER_SUBNET_PREFIX = 29;

/** Networks are never created at the same time, otherwise they could pick the same subnet */
const enqueue = createQueue("network-subnet-queue");

async function listUsedSubnets() {
  const networks = await docker.listNetworks();
  // Docker doesn't check the networks of the host for explicit subnets
  const hostAddresses = Object.values(os.networkInterfaces()).flatMap(addresses => addresses ?? []);
  return [
    ...networks.flatMap(network => network.IPAM?.Config ?? []).map(config => config.Subnet),
    ...hostAddresses.map(address => address.cidr),
  ].filter(subnet => typeof subnet === "string");
}

/** Creates a network with the first free subnet of the range of Buttler, so the subnets of removed networks are reused */
export function createButtlerNetwork(options: Omit<Docker.NetworkCreateOptions, "IPAM">) {
  return enqueue(async () => {
    const subnet = findFreeSubnet(BUTTLER_SUBNET_RANGE, BUTTLER_SUBNET_PREFIX, await listUsedSubnets());
    if (!subnet) {
      throw new Error(`No free subnet left in ${BUTTLER_SUBNET_RANGE} for ${options.Name}`);
    }
    return docker.createNetwork({
      ...options,
      IPAM: {
        Driver: "default",
        Config: [{ Subnet: subnet }],
      },
    });
  });
}
