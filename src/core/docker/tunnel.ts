import { docker, pullImage } from "~/core/docker";
import { REVERSE_PROXY_CONTAINER_NAME } from "./containers";
import { FORBIDDEN, NOT_FOUND, NOT_MODIFIED, ignoreStatus } from "./errors";
import { BUTTLER_NETWORK_LABEL, BUTTLER_SERVICE_LABEL, BUTTLER_TUNNEL_LABEL } from "./labels";
import type Docker from "dockerode";

export const TUNNEL_CONTAINER_NAME = "buttler-cloudflared";
export const TUNNEL_IMAGE = "cloudflare/cloudflared:latest";
export const TUNNEL_NETWORK_NAME = "buttler-tunnel";

const TUNNEL_NETWORK = "tunnel";

export type TunnelContainerOptions = {
  serviceId: string,
  tunnelId: string,
  token: string,
};

/** Only returns the network that is created by Buttler */
async function findNetwork() {
  const networks = await docker.listNetworks({
    filters: { label: [`${BUTTLER_NETWORK_LABEL}=${TUNNEL_NETWORK}`] },
  });
  return networks.at(0);
}

/** It's not internal, because cloudflared connects to Cloudflare through it */
async function ensureNetwork() {
  const existing = await findNetwork();
  if (existing) return { id: existing.Id, name: existing.Name };
  const { id } = await docker.createNetwork({
    Name: TUNNEL_NETWORK_NAME,
    Driver: "bridge",
    Labels: {
      "com.docker.compose.project": "buttler",
      [BUTTLER_NETWORK_LABEL]: TUNNEL_NETWORK,
    },
  });
  return { id, name: TUNNEL_NETWORK_NAME };
}

/** The containers from outside of Buttler don't have the label, even if they have the name */
async function findContainer(name: string) {
  const containers = await docker.listContainers({ all: true });
  return containers.find(container => container.Names.includes(`/${name}`) && container.Labels[BUTTLER_SERVICE_LABEL]);
}

/** Lets cloudflared reach Nginx. Does nothing if there is no tunnel. */
export async function connectProxyToTunnel() {
  const network = await findNetwork();
  if (!network) return;
  const proxy = await findContainer(REVERSE_PROXY_CONTAINER_NAME);
  const endpoint = proxy?.NetworkSettings.Networks[network.Name] as Docker.EndpointSettings | undefined;
  if (!proxy || endpoint?.NetworkID === network.Id) return;
  await ignoreStatus(docker.getNetwork(network.Id).connect({ Container: proxy.Id }), NOT_FOUND);
}

async function ensureImage() {
  try {
    await docker.getImage(TUNNEL_IMAGE).inspect();
  } catch {
    await pullImage(TUNNEL_IMAGE);
  }
}

async function removeContainer(id: string) {
  const container = docker.getContainer(id);
  await ignoreStatus(container.stop({ t: 10 }), NOT_MODIFIED, NOT_FOUND);
  await ignoreStatus(container.remove({ force: true }), NOT_FOUND);
}

/** Starts cloudflared, and replaces a container that belongs to another tunnel */
export async function startTunnelContainer({ serviceId, tunnelId, token }: TunnelContainerOptions) {
  const network = await ensureNetwork();
  await connectProxyToTunnel();

  const existing = await findContainer(TUNNEL_CONTAINER_NAME);
  const labels = {
    "com.docker.compose.project": "buttler",
    [BUTTLER_SERVICE_LABEL]: serviceId,
    [BUTTLER_TUNNEL_LABEL]: tunnelId,
  };
  if (existing) {
    const isCurrent = Object.entries(labels).every(([key, value]) => existing.Labels[key] === value);
    const isConnected = (existing.NetworkSettings.Networks[network.name] as Docker.EndpointSettings | undefined)
      ?.NetworkID === network.id;
    if (isCurrent && isConnected) {
      await ignoreStatus(docker.getContainer(existing.Id).start(), NOT_MODIFIED);
      return;
    }
  }

  // The old container keeps running if the image can't be pulled
  await ensureImage();
  if (existing) await removeContainer(existing.Id);

  const container = await docker.createContainer({
    name: TUNNEL_CONTAINER_NAME,
    Image: TUNNEL_IMAGE,
    // The default command of the image only prints its version
    Cmd: ["tunnel", "--no-autoupdate", "run"],
    Env: [`TUNNEL_TOKEN=${token}`],
    Labels: labels,
    HostConfig: {
      // It must not reach the services, so it's not in the default network
      NetworkMode: network.name,
      RestartPolicy: {
        Name: "always",
      },
    },
    Tty: false,
  });
  await container.start();
}

export async function removeTunnelContainer() {
  const existing = await findContainer(TUNNEL_CONTAINER_NAME);
  if (existing) await removeContainer(existing.Id);

  const networkInfo = await findNetwork();
  if (!networkInfo) return;
  const network = docker.getNetwork(networkInfo.Id);
  const proxy = await findContainer(REVERSE_PROXY_CONTAINER_NAME);
  if (proxy && networkInfo.Name in proxy.NetworkSettings.Networks) {
    await ignoreStatus(network.disconnect({ Container: proxy.Id, Force: true }), NOT_FOUND);
  }
  // The network is kept if it's used by containers from outside of Buttler
  await ignoreStatus(network.remove(), NOT_FOUND, FORBIDDEN);
}
