import { type DeviceKind, getDeviceHostConfig } from "~/core/devices";
import { docker } from "~/core/docker";
import { getServiceImageTag } from "~/core/dockerhub";
import { type ServiceEnvironmentVariable, getRuntimeVariables } from "~/core/environment-variables";
import { getSharedState } from "~/core/shared-state";
import db from "~/database";
import { TUNNEL_SERVICE_NAME } from "~/operations/getTunnelService";
import hasInternetAccess from "~/operations/hasInternetAccess";
import { getBuildingServiceIds } from "./builds";
import {
  REVERSE_PROXY_CONTAINER_NAME,
  getReplacementContainerName,
  getServiceContainerName,
  hasContainerName,
  isOwnContainer,
} from "./containers";
import { NOT_FOUND, NOT_MODIFIED, ignoreStatus } from "./errors";
import { ensureServiceNetwork, removeServiceNetworks } from "./internet";
import { BUTTLER_SERVICE_LABEL, BUTTLER_VOLUME_LABEL } from "./labels";
import { connectLinkNetworks } from "./links";
import type { PullProgress } from "./pull-progress";
import type Docker from "dockerode";

export type ContainerRuntimeStatus = "running" | "stopped" | "exited" | "building" | "pulling" | "restarting";

export type ContainerPortBinding = {
  external?: number,
  internal: number,
  type?: string,
  hostIp?: string,
};

export type ServiceRuntimeState = {
  containerId: string | null,
  containerName: string | null,
  /** ID of the image that the container is created from */
  imageId: string | null,
  status: ContainerRuntimeStatus,
  state: string,
  uptime: string | null,
  startedAt: string | null,
  ipAddresses: string[],
  ports: ContainerPortBinding[],
};

const activeBuildServices = getSharedState("active-builds", () => new Set<string>());
const activePullServices = getSharedState("active-pulls", () => new Set<string>());

export function markServiceBuilding(serviceId: string, isBuilding: boolean) {
  if (isBuilding) {
    activeBuildServices.add(serviceId);
  } else {
    activeBuildServices.delete(serviceId);
  }
}

export function isServiceBuilding(serviceId: string): boolean {
  return activeBuildServices.has(serviceId);
}

const pullProgresses = getSharedState("pull-progresses", () => new Map<string, PullProgress>());

export function markServicePulling(serviceId: string, isPulling: boolean) {
  if (isPulling) {
    activePullServices.add(serviceId);
  } else {
    activePullServices.delete(serviceId);
    pullProgresses.delete(serviceId);
  }
}

export function isServicePulling(serviceId: string): boolean {
  return activePullServices.has(serviceId);
}

/** Returns the progress of the image pull of a service, or null if it hasn't started downloading yet */
export function getServicePullProgress(serviceId: string): PullProgress | null {
  return pullProgresses.get(serviceId) ?? null;
}

type PullImage = (imageName: string, onProgress: (progress: PullProgress) => void) => Promise<unknown>;

function pullServiceImage(serviceId: string, imageTag: string, pullImage: PullImage) {
  return pullImage(imageTag, progress => {
    // A late event must not bring back the progress of a finished pull
    if (isServicePulling(serviceId)) pullProgresses.set(serviceId, progress);
  });
}

const deletingServices = getSharedState("deleting-services", () => new Set<string>());
// Counted, since the same service can be deployed by more than one request at once
const activeDeploys = getSharedState("active-deploys", () => new Map<string, number>());

export function markServiceDeleting(serviceId: string, isDeleting: boolean) {
  if (isDeleting) {
    deletingServices.add(serviceId);
  } else {
    deletingServices.delete(serviceId);
  }
}

export function isServiceDeleting(serviceId: string): boolean {
  return deletingServices.has(serviceId);
}

export function isServiceDeploying(serviceId: string): boolean {
  return activeDeploys.has(serviceId);
}

export class ServiceDeletingError extends Error {
  constructor(serviceId: string) {
    super(`Service ${serviceId} is being deleted`);
    this.name = "ServiceDeletingError";
  }
}

/** A service that is being deleted must not be built, pulled, started or deployed, or it would lose its volumes */
export function assertServiceNotDeleting(serviceId: string) {
  if (isServiceDeleting(serviceId)) throw new ServiceDeletingError(serviceId);
}

export function parseContainerRuntimeStatus(container?: Docker.ContainerInfo): ContainerRuntimeStatus {
  if (!container) return "stopped";

  const state = container.State.toLowerCase();
  if (state === "running") return "running";
  if (state === "restarting") return "restarting";
  // The restart policy starts a container again whenever it exits, so an exited one was stopped on purpose
  if (state === "created" || state === "paused" || state === "exited") return "stopped";
  return "exited";
}

export function formatContainerUptime(statusStr?: string): string | null {
  if (!statusStr || !statusStr.startsWith("Up ")) return null;
  return statusStr.replace(/\s*\(.*\)$/, "").trim();
}

export function extractContainerPorts(container?: Docker.ContainerInfo): ContainerPortBinding[] {
  if (!container?.Ports) return [];
  return container.Ports.map(p => ({
    external: p.PublicPort,
    internal: p.PrivatePort,
    type: p.Type,
    hostIp: p.IP,
  }));
}

export function extractContainerIpAddresses(container?: Docker.ContainerInfo): string[] {
  const networks = container?.NetworkSettings ? container.NetworkSettings.Networks : undefined;
  if (!networks) return [];
  return Object.values(networks)
    .map(network => network.IPAddress)
    .filter(Boolean);
}

export function matchContainerForService(
  service: { id: string, name?: string, type?: string },
  containers: Docker.ContainerInfo[],
): Docker.ContainerInfo | undefined {
  const labelled = containers.filter(c => c.Labels[BUTTLER_SERVICE_LABEL] === service.id);
  // While a container is replaced, the old one keeps the name of the service
  const byLabel = labelled.find(c => hasContainerName(c, getServiceContainerName(service.id))) ?? labelled.at(0);
  if (byLabel) return byLabel;

  if (service.type === "system" && service.name === "Reverse Proxy Server") {
    const reverseProxy = containers.find(c => c.Names.includes(`/${REVERSE_PROXY_CONTAINER_NAME}`));
    if (reverseProxy) return reverseProxy;
  }

  return containers.find(c => isOwnContainer(c, service.id));
}

export function createServiceRuntimeState(
  serviceId: string,
  container?: Docker.ContainerInfo,
  isBuilding = isServiceBuilding(serviceId),
): ServiceRuntimeState {
  if (isServicePulling(serviceId)) {
    return {
      containerId: container?.Id ?? null,
      containerName: container?.Names[0]?.replace(/^\//, "") ?? null,
      imageId: container?.ImageID ?? null,
      status: "pulling",
      state: "pulling",
      uptime: null,
      startedAt: null,
      ipAddresses: extractContainerIpAddresses(container),
      ports: extractContainerPorts(container),
    };
  }

  if (isBuilding) {
    return {
      containerId: container?.Id ?? null,
      containerName: container?.Names[0]?.replace(/^\//, "") ?? null,
      imageId: container?.ImageID ?? null,
      status: "building",
      state: "building",
      uptime: null,
      startedAt: null,
      ipAddresses: extractContainerIpAddresses(container),
      ports: extractContainerPorts(container),
    };
  }

  if (!container) {
    return {
      containerId: null,
      containerName: null,
      imageId: null,
      status: "stopped",
      state: "stopped",
      uptime: null,
      startedAt: null,
      ipAddresses: [],
      ports: [],
    };
  }

  return {
    containerId: container.Id,
    containerName: container.Names[0]?.replace(/^\//, "") ?? null,
    imageId: container.ImageID,
    status: parseContainerRuntimeStatus(container),
    state: container.State,
    uptime: formatContainerUptime(container.Status),
    startedAt: null,
    ipAddresses: extractContainerIpAddresses(container),
    ports: extractContainerPorts(container),
  };
}

/** Enough to find the container of a service */
export type ServiceIdentity = {
  id: string,
  name?: string,
  type?: string,
};

export type ServiceRef = ServiceIdentity & {
  repository?: string | null,
  branch?: string | null,
  ports?: { external: number, internal: number }[],
  environmentVariables?: ServiceEnvironmentVariable[],
  /** Variables from the links of the service, resolved when it's loaded */
  inheritedVariables?: Record<string, string>,
  volumes?: { name: string, containerPath: string }[],
  /** Kinds of host devices the container can open */
  devices?: { kind: DeviceKind }[],
};

export async function getServicesRuntimeStates(services: ServiceIdentity[]): Promise<Record<string, ServiceRuntimeState>> {
  let containers: Docker.ContainerInfo[];
  try {
    containers = await docker.listContainers({ all: true });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to query Docker containers:", error);
    return Object.fromEntries(services.map(s => [s.id, createServiceRuntimeState(s.id)]));
  }

  // Only GitHub services are built
  const hasBuilds = services.some(service => service.type === "github");
  const buildingIds = hasBuilds ? await getBuildingServiceIds() : new Set<string>();

  const result: Record<string, ServiceRuntimeState> = {};
  for (const service of services) {
    const matched = matchContainerForService(service, containers);
    // Buttler also tracks the steps that Docker is not aware of, e.g. cloning the repository
    const isBuilding = isServiceBuilding(service.id) || buildingIds.has(service.id);
    result[service.id] = createServiceRuntimeState(service.id, matched, isBuilding);
  }
  return result;
}

export async function getServiceRuntimeState(service: ServiceIdentity): Promise<ServiceRuntimeState> {
  const map = await getServicesRuntimeStates([service]);
  return map[service.id];
}

export async function findServiceContainer(service: ServiceIdentity): Promise<Docker.Container | null> {
  let containers: Docker.ContainerInfo[];
  try {
    containers = await docker.listContainers({ all: true });
  } catch {
    return null;
  }
  const matched = matchContainerForService(service, containers);
  if (matched?.Id) {
    return docker.getContainer(matched.Id);
  }
  return null;
}

export async function isImagePresentLocally(tag: string): Promise<boolean> {
  const fullTag = tag.includes(":") ? tag : `${tag}:latest`;
  try {
    const img = docker.getImage(fullTag);
    await img.inspect();
    return true;
  } catch {
    return false;
  }
}

export async function startServiceContainer(service: ServiceRef): Promise<void> {
  assertServiceNotDeleting(service.id);
  if (service.type === "system" && service.name === "Reverse Proxy Server") {
    const { provisionReverseProxy } = await import("~/core/nginx");
    await provisionReverseProxy();
    return;
  }

  if (service.type === "system" && service.name === TUNNEL_SERVICE_NAME) {
    const { provisionTunnel } = await import("~/core/cloudflare/tunnel");
    if (!await provisionTunnel()) throw new Error("There is no Cloudflare tunnel to run");
    return;
  }

  if (service.type === "github") {
    const { startGitHubService } = await import("~/core/build");
    await startGitHubService(service);
    return;
  }

  if (service.type !== "dockerhub") {
    const container = await findServiceContainer(service);
    if (!container) {
      throw new Error(`No container found for service ${service.id}`);
    }
    try {
      await container.start();
    } catch (err: unknown) {
      const error = err as { statusCode?: number };
      if (error.statusCode !== 304) {
        throw err;
      }
    }
    return;
  }

  const imageTag = getServiceImageTag(service);
  if (!imageTag) {
    throw new Error(`No Docker Hub image specified for service ${service.id}`);
  }

  const hasImage = await isImagePresentLocally(imageTag);
  if (!hasImage) {
    markServicePulling(service.id, true);
    try {
      const { pullImage } = await import("~/core/docker");
      await pullServiceImage(service.id, imageTag, pullImage);
    } finally {
      markServicePulling(service.id, false);
    }
  }

  await deployServiceContainer(service, imageTag);
}

/** Pulls the image of a Docker Hub service and replaces its container, which keeps running until the image is ready */
export async function pullAndDeployService(service: ServiceRef): Promise<void> {
  assertServiceNotDeleting(service.id);
  // The service stays marked until the container is replaced, otherwise it would look idle in between
  markServicePulling(service.id, true);
  try {
    const imageTag = getServiceImageTag(service);
    if (!imageTag) {
      throw new Error(`No Docker Hub image specified for service ${service.id}`);
    }
    const { pullImage } = await import("~/core/docker");
    await pullServiceImage(service.id, imageTag, pullImage);
    await deployServiceContainer(service, imageTag);
  } finally {
    markServicePulling(service.id, false);
  }
}

/** Replaces the container of a service (if there is any) with a new one that runs the given image */
export async function deployServiceContainer(service: ServiceRef, image: string): Promise<void> {
  // The check and the mark are made at once, so a deletion either refuses this deploy or waits for it
  assertServiceNotDeleting(service.id);
  activeDeploys.set(service.id, (activeDeploys.get(service.id) ?? 0) + 1);
  try {
    await replaceServiceContainer(service, image);
  } finally {
    const count = (activeDeploys.get(service.id) ?? 1) - 1;
    if (count > 0) {
      activeDeploys.set(service.id, count);
    } else {
      activeDeploys.delete(service.id);
    }
  }
}

async function replaceServiceContainer(service: ServiceRef, image: string) {
  // If the networks can't be created, the old container keeps running
  await connectLinkNetworks(service.id);
  const hasInternet = await hasInternetAccess(db, service.id);
  // A network given at creation replaces the default bridge network, where every container could reach the others.
  // It must exist as long as the container does, Docker can't start a container whose NetworkMode is gone.
  const serviceNetwork = await ensureServiceNetwork(service.id, hasInternet);

  const ownContainers = (await docker.listContainers({ all: true })).filter(c => isOwnContainer(c, service.id));
  const oldInfo = matchContainerForService(service, ownContainers);
  // A replacement that a deploy left behind, e.g. when Buttler stopped in the middle of it
  for (const leftover of ownContainers.filter(c => c.Id !== oldInfo?.Id)) {
    await ignoreStatus(docker.getContainer(leftover.Id).remove({ force: true }), NOT_FOUND);
  }

  const serviceContainerName = getServiceContainerName(service.id);
  // Container names are unique, so the new container has a temporary name while the old one exists
  const containerName = oldInfo && hasContainerName(oldInfo, serviceContainerName)
    ? getReplacementContainerName(service.id)
    : serviceContainerName;

  if (service.volumes && service.volumes.length > 0) {
    for (const vol of service.volumes) {
      try {
        await docker.createVolume({ Name: vol.name, Labels: { [BUTTLER_VOLUME_LABEL]: "true" } });
      } catch {
        // ignore
      }
    }
  }

  const portBindings: Record<string, { HostPort: string }[]> = {};
  const exposedPorts: Record<string, object> = {};
  for (const p of service.ports ?? []) {
    portBindings[`${p.internal}/tcp`] = [{ HostPort: String(p.external) }];
    exposedPorts[`${p.internal}/tcp`] = {};
  }

  const env = Object.entries({
    ...service.inheritedVariables,
    ...getRuntimeVariables(service.environmentVariables),
  }).map(([key, value]) => `${key}=${value}`);
  const binds = (service.volumes ?? []).map(v => `${v.name}:${v.containerPath}`);
  const deviceConfig = getDeviceHostConfig((service.devices ?? []).map(d => d.kind));

  const container = await docker.createContainer({
    name: containerName,
    Image: image,
    Labels: {
      [BUTTLER_SERVICE_LABEL]: service.id,
      "com.docker.compose.project": "buttler",
    },
    Env: env,
    HostConfig: {
      Binds: [...binds, ...deviceConfig.binds],
      DeviceCgroupRules: deviceConfig.cgroupRules,
      PortBindings: portBindings,
      // A container that the user stopped stays stopped when Docker restarts
      RestartPolicy: {
        Name: "unless-stopped",
      },
      NetworkMode: serviceNetwork,
    },
    NetworkingConfig: {
      EndpointsConfig: { [serviceNetwork]: {} },
    },
    ExposedPorts: exposedPorts,
    Tty: false,
  });

  const oldContainer = oldInfo ? docker.getContainer(oldInfo.Id) : null;
  // Two containers can't publish the same host port and shouldn't write to the same volume
  const needsDowntime = !!oldInfo && (Object.keys(portBindings).length > 0 || binds.length > 0);
  const wasRunning = oldInfo?.State === "running" || oldInfo?.State === "restarting";
  try {
    // The links reach the new container by an alias, the old one keeps the name until it's removed
    await connectLinkNetworks(service.id);
    if (needsDowntime) {
      await ignoreStatus(oldContainer!.stop({ t: 10 }), NOT_MODIFIED, NOT_FOUND);
    }
    await container.start();
  } catch (error) {
    // A failed deployment leaves the service on its old container
    await ignoreStatus(container.remove({ force: true }), NOT_FOUND);
    if (needsDowntime && wasRunning) {
      try {
        await ignoreStatus(oldContainer!.start(), NOT_MODIFIED, NOT_FOUND);
      } catch (startError) {
        // eslint-disable-next-line no-console
        console.error(`Failed to start the old container of service ${service.id} again:`, startError);
      }
    }
    throw error;
  }

  // The new container runs, so a failure from here on is only logged
  if (oldContainer) {
    try {
      await ignoreStatus(oldContainer.stop({ t: 10 }), NOT_MODIFIED, NOT_FOUND);
      await ignoreStatus(oldContainer.remove({ force: true }), NOT_FOUND);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Failed to remove the old container of service ${service.id}:`, error);
    }
  }
  if (containerName !== serviceContainerName) {
    try {
      await container.rename({ name: serviceContainerName });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Failed to rename the new container of service ${service.id}:`, error);
    }
  }
  // The old container may have been on the other network, if the internet access of the service has changed
  try {
    await removeServiceNetworks(service.id, hasInternet);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Failed to remove the unused network of service ${service.id}:`, error);
  }
}

/** Stops the container of a service and keeps it, so its logs stay readable */
export async function stopServiceContainer(service: ServiceIdentity): Promise<void> {
  const container = await findServiceContainer(service) ?? docker.getContainer(getServiceContainerName(service.id));
  try {
    await container.stop({ t: 10 });
  } catch (err: unknown) {
    const error = err as { statusCode?: number };
    // 304: it's already stopped, 404: there is no container
    if (error.statusCode !== 304 && error.statusCode !== 404) {
      throw err;
    }
  }
}

export async function restartServiceContainer(service: ServiceRef): Promise<void> {
  assertServiceNotDeleting(service.id);
  if (service.type === "system" && service.name === "Reverse Proxy Server") {
    const { provisionReverseProxy } = await import("~/core/nginx");
    await provisionReverseProxy();
    return;
  }
  // Their start replaces the container, which keeps running until its replacement has started
  if (service.type !== "dockerhub" && service.type !== "github") {
    await stopServiceContainer(service);
  }
  await startServiceContainer(service);
}
