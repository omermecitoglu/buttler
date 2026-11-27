import { docker } from "~/core/docker";
import { createQueue } from "~/core/queue";
import db from "~/database";
import type { ServiceLinkDTO } from "~/models/service-link";
import getServiceLinks from "~/operations/getServiceLinks";
import updateReverseProxyLinks from "~/operations/syncReverseProxyLinks";
import { getServiceContainerName, isOwnContainer } from "./containers";
import { FORBIDDEN, NOT_FOUND, ignoreStatus } from "./errors";
import { BUTTLER_LINK_LABEL, BUTTLER_NETWORK_LABEL, BUTTLER_SERVICE_LABEL } from "./labels";
import { createButtlerNetwork } from "./networks";
import type Docker from "dockerode";

const LINK_NETWORK = "link";

type LinkNetwork = Pick<Docker.NetworkInspectInfo, "Id" | "Name">;

type Link = Pick<ServiceLinkDTO, "id" | "serviceAId" | "serviceBId">;

/** Changes never overlap, otherwise they could undo each other */
const enqueue = createQueue("link-queue");

export function getLinkNetworkName(linkId: string) {
  return `buttler-link-${linkId}`;
}

/** Only returns the networks that are created by Buttler */
function listLinkNetworks(linkId?: string) {
  return docker.listNetworks({
    filters: {
      label: [
        `${BUTTLER_NETWORK_LABEL}=${LINK_NETWORK}`,
        ...linkId ? [`${BUTTLER_LINK_LABEL}=${linkId}`] : [],
      ],
    },
  });
}

async function createLinkNetwork(linkId: string): Promise<LinkNetwork> {
  const name = getLinkNetworkName(linkId);
  const network = await createButtlerNetwork({
    Name: name,
    Driver: "bridge",
    // Only the internet network of a service reaches the outside
    Internal: true,
    Labels: {
      "com.docker.compose.project": "buttler",
      [BUTTLER_NETWORK_LABEL]: LINK_NETWORK,
      [BUTTLER_LINK_LABEL]: linkId,
    },
  });
  return { Id: network.id, Name: name };
}

function getEndpoint(container: Docker.ContainerInfo, network: LinkNetwork) {
  return container.NetworkSettings.Networks[network.Name] as Docker.EndpointSettings | undefined;
}

function listContainers() {
  return docker.listContainers({ all: true }).then(containers => {
    return containers.filter(container => container.State !== "removing");
  });
}

/** A replacement has a temporary name until the old container is removed, so services reach each other by an alias */
async function connectContainer(network: LinkNetwork, container: Docker.ContainerInfo, serviceId: string) {
  if (getEndpoint(container, network)?.NetworkID === network.Id) return;
  // The container may be replaced in the meantime, the new one is connected by its own deployment
  await ignoreStatus(docker.getNetwork(network.Id).connect({
    Container: container.Id,
    EndpointConfig: { Aliases: [getServiceContainerName(serviceId)] },
  }), NOT_FOUND);
}

async function connect(link: Link, containers: Docker.ContainerInfo[]) {
  const network = (await listLinkNetworks(link.id)).at(0) ?? await createLinkNetwork(link.id);
  for (const serviceId of [link.serviceAId, link.serviceBId]) {
    for (const container of containers.filter(info => isOwnContainer(info, serviceId))) {
      await connectContainer(network, container, serviceId);
    }
  }
}

/** Only the containers of services are disconnected, the network is kept if others still use it */
async function removeNetworks(networks: LinkNetwork[], containers: Docker.ContainerInfo[]) {
  for (const networkInfo of networks) {
    const network = docker.getNetwork(networkInfo.Id);
    for (const container of containers) {
      if (!getEndpoint(container, networkInfo) || !container.Labels[BUTTLER_SERVICE_LABEL]) continue;
      await ignoreStatus(network.disconnect({ Container: container.Id, Force: true }), NOT_FOUND);
    }
    await ignoreStatus(network.remove(), NOT_FOUND, FORBIDDEN);
  }
}

async function sync(linkId: string, links: Link[], containers: Docker.ContainerInfo[]) {
  const link = links.find(({ id }) => id === linkId);
  if (link) {
    await connect(link, containers);
  } else {
    await removeNetworks(await listLinkNetworks(linkId), containers);
  }
}

/** Connects the containers of a link if it's in SQLite, otherwise removes its network */
export function syncLinkNetwork(linkId: string): Promise<void> {
  return enqueue(async () => {
    // The link may have changed while waiting for other changes
    const [
      links,
      containers,
    ] = await Promise.all([
      getServiceLinks(db),
      listContainers(),
    ]);
    await sync(linkId, links, containers);
  });
}

/**
 * Links nginx to a service while it has a domain, and syncs the network of that link.
 * Without a service, it does the same for all of them, and a link that fails doesn't affect the others.
 */
export function syncReverseProxyLinks(serviceId?: string): Promise<void> {
  return enqueue(async () => {
    // The domains may have changed while waiting for other changes
    const linkIds = updateReverseProxyLinks(db, serviceId);
    const [
      links,
      containers,
    ] = await Promise.all([
      getServiceLinks(db),
      listContainers(),
    ]);
    for (const linkId of linkIds) {
      try {
        await sync(linkId, links, containers);
      } catch (error) {
        if (serviceId) throw error;
        // eslint-disable-next-line no-console
        console.error(`Failed to sync the network of link ${linkId}:`, error);
      }
    }
  });
}

/** Connects the containers of a service to the networks of all of its links */
export function connectLinkNetworks(serviceId: string): Promise<void> {
  return enqueue(async () => {
    const [
      links,
      containers,
    ] = await Promise.all([
      getServiceLinks(db, serviceId),
      listContainers(),
    ]);
    for (const link of links) {
      await connect(link, containers);
    }
  });
}

/** Removes the networks of the links of a service that is about to be deleted with its links */
export function removeLinkNetworks(serviceId: string): Promise<void> {
  return enqueue(async () => {
    const [
      links,
      containers,
    ] = await Promise.all([
      getServiceLinks(db, serviceId),
      listContainers(),
    ]);
    for (const link of links) {
      await removeNetworks(await listLinkNetworks(link.id), containers);
    }
  });
}

/** Syncs the networks of all links, and removes the leftovers. A link that fails doesn't affect the others. */
export function syncLinkNetworks(): Promise<void> {
  return enqueue(async () => {
    const [
      links,
      networks,
      containers,
    ] = await Promise.all([
      getServiceLinks(db),
      listLinkNetworks(),
      listContainers(),
    ]);
    const networkLinkIds = networks.flatMap(network => network.Labels?.[BUTTLER_LINK_LABEL] ?? []);
    for (const linkId of new Set([...links.map(({ id }) => id), ...networkLinkIds])) {
      try {
        await sync(linkId, links, containers);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`Failed to sync the network of link ${linkId}:`, error);
      }
    }
  });
}
