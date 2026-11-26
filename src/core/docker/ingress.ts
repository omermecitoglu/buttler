import { docker } from "~/core/docker";
import { createQueue } from "~/core/queue";
import db from "~/database";
import getServicesWithDomains from "~/operations/getServicesWithDomains";
import { REVERSE_PROXY_CONTAINER_NAME, isOwnContainer } from "./containers";
import { FORBIDDEN, NOT_FOUND, ignoreStatus } from "./errors";
import { BUTTLER_NETWORK_LABEL, BUTTLER_SERVICE_LABEL } from "./labels";
import { createButtlerNetwork } from "./networks";
import type Docker from "dockerode";

const INGRESS_NETWORK = "ingress";

type IngressNetwork = Pick<Docker.NetworkInspectInfo, "Id" | "Name">;

/** Changes never overlap, otherwise they could undo each other */
const enqueue = createQueue("ingress-queue");

export function getIngressNetworkName(serviceId: string) {
  return `buttler-ingress-${serviceId}`;
}

/** The host name of a service for Nginx, it stays the same when the container is replaced */
export function getIngressAlias(serviceId: string) {
  return `service-${serviceId}`;
}

/** Only returns the networks that are created by Buttler */
function listIngressNetworks(serviceId?: string) {
  return docker.listNetworks({
    filters: {
      label: [
        `${BUTTLER_NETWORK_LABEL}=${INGRESS_NETWORK}`,
        ...serviceId ? [`${BUTTLER_SERVICE_LABEL}=${serviceId}`] : [],
      ],
    },
  });
}

async function createIngressNetwork(serviceId: string): Promise<IngressNetwork> {
  const name = getIngressNetworkName(serviceId);
  const network = await createButtlerNetwork({
    Name: name,
    Driver: "bridge",
    // Only the internet network of a service reaches the outside
    Internal: true,
    Labels: {
      "com.docker.compose.project": "buttler",
      [BUTTLER_NETWORK_LABEL]: INGRESS_NETWORK,
      [BUTTLER_SERVICE_LABEL]: serviceId,
    },
  });
  return { Id: network.id, Name: name };
}

function getEndpoint(container: Docker.ContainerInfo, network: IngressNetwork) {
  return container.NetworkSettings.Networks[network.Name] as Docker.EndpointSettings | undefined;
}

async function connectContainer(network: IngressNetwork, container: Docker.ContainerInfo, aliases: string[]) {
  if (getEndpoint(container, network)?.NetworkID === network.Id) return;
  // The container may be replaced in the meantime, the new one is connected by its own deployment
  await ignoreStatus(docker.getNetwork(network.Id).connect({
    Container: container.Id,
    EndpointConfig: { Aliases: aliases },
  }), NOT_FOUND);
}

/** Returns the containers of the service, and the one of Nginx */
async function findMembers(serviceId: string) {
  const containers = (await docker.listContainers({ all: true })).filter(container => container.State !== "removing");
  return {
    serviceContainers: containers.filter(container => isOwnContainer(container, serviceId)),
    proxyContainers: containers.filter(container => container.Names.includes(`/${REVERSE_PROXY_CONTAINER_NAME}`)),
  };
}

async function connect(serviceId: string) {
  const networks = await listIngressNetworks(serviceId);
  const network = networks.at(0) ?? await createIngressNetwork(serviceId);
  const { serviceContainers, proxyContainers } = await findMembers(serviceId);
  for (const container of serviceContainers) {
    await connectContainer(network, container, [getIngressAlias(serviceId)]);
  }
  for (const container of proxyContainers) {
    await connectContainer(network, container, []);
  }
}

async function disconnect(serviceId: string) {
  const networks = await listIngressNetworks(serviceId);
  if (networks.length === 0) return;
  const { serviceContainers, proxyContainers } = await findMembers(serviceId);
  for (const networkInfo of networks) {
    const network = docker.getNetwork(networkInfo.Id);
    for (const container of [...serviceContainers, ...proxyContainers]) {
      if (!getEndpoint(container, networkInfo)) continue;
      await ignoreStatus(network.disconnect({ Container: container.Id, Force: true }), NOT_FOUND);
    }
    // Networks that are used by containers from outside of Buttler are kept
    await ignoreStatus(network.remove(), NOT_FOUND, FORBIDDEN);
  }
}

async function sync(serviceId: string, hasDomains: boolean) {
  await (hasDomains ? connect(serviceId) : disconnect(serviceId));
}

/** Connects a service to Nginx if it has a domain, otherwise removes the network between them */
export function syncIngressNetwork(serviceId: string): Promise<void> {
  return enqueue(async () => {
    // The domains may have changed while waiting for other changes
    const serviceIds = await getServicesWithDomains(db);
    await sync(serviceId, serviceIds.includes(serviceId));
  });
}

/** Syncs the networks of all services. A service that fails doesn't affect the others. */
export function syncIngressNetworks(): Promise<void> {
  return enqueue(async () => {
    const serviceIds = await getServicesWithDomains(db);
    const networks = await listIngressNetworks();
    // Networks of the services without a domain are leftovers
    const networkOwners = networks.flatMap(network => network.Labels?.[BUTTLER_SERVICE_LABEL] ?? []);
    for (const serviceId of new Set([...serviceIds, ...networkOwners])) {
      try {
        await sync(serviceId, serviceIds.includes(serviceId));
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`Failed to sync the ingress network of service ${serviceId}:`, error);
      }
    }
  });
}

/** Removes the network of a service that is about to be deleted with its domains */
export function removeIngressNetwork(serviceId: string): Promise<void> {
  return enqueue(() => disconnect(serviceId));
}
