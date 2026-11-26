import { docker } from "~/core/docker";
import { getServiceImageTag } from "~/core/dockerhub";
import { type ServiceEnvironmentVariable, getRuntimeVariables } from "~/core/environment-variables";
import { getSharedState } from "~/core/shared-state";
import db from "~/database";
import { TUNNEL_SERVICE_NAME } from "~/operations/getTunnelService";
import hasInternetAccess from "~/operations/hasInternetAccess";
import { getBuildingServiceIds } from "./builds";
import { REVERSE_PROXY_CONTAINER_NAME, isOwnContainer } from "./containers";
import { syncIngressNetwork } from "./ingress";
import { ensureInternetNetwork, removeInternetNetwork } from "./internet";
import { BUTTLER_SERVICE_LABEL } from "./labels";
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

export function markServicePulling(serviceId: string, isPulling: boolean) {
  if (isPulling) {
    activePullServices.add(serviceId);
  } else {
    activePullServices.delete(serviceId);
  }
}

export function isServicePulling(serviceId: string): boolean {
  return activePullServices.has(serviceId);
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
  if (state === "created" || state === "paused") return "stopped";
  if (state === "exited") {
    if (container.Status.startsWith("Exited (0)")) {
      return "stopped";
    }
    return "exited";
  }
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
  const byLabel = containers.find(c => c.Labels[BUTTLER_SERVICE_LABEL] === service.id);
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
  volumes?: { name: string, containerPath: string }[],
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
      await pullImage(imageTag);
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
    await pullImage(imageTag);
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
  await syncIngressNetwork(service.id);
  // A network given at creation replaces the default bridge network, where every container could reach the others
  const internetNetwork = await ensureInternetNetwork(service.id);

  const existingContainer = await findServiceContainer(service);
  if (existingContainer) {
    try {
      await existingContainer.stop({ t: 10 });
    } catch {
      // ignore
    }
    try {
      await existingContainer.remove({ force: true });
    } catch {
      // ignore
    }
  }

  const containerName = `buttler-service-${service.id}`;
  try {
    const byName = docker.getContainer(containerName);
    await byName.remove({ force: true });
  } catch {
    // ignore
  }

  if (service.volumes && service.volumes.length > 0) {
    for (const vol of service.volumes) {
      try {
        await docker.createVolume({ Name: vol.name });
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

  const env = Object.entries(getRuntimeVariables(service.environmentVariables)).map(([key, value]) => `${key}=${value}`);
  const binds = (service.volumes ?? []).map(v => `${v.name}:${v.containerPath}`);

  const container = await docker.createContainer({
    name: containerName,
    Image: image,
    Labels: {
      [BUTTLER_SERVICE_LABEL]: service.id,
      "com.docker.compose.project": "buttler",
    },
    Env: env,
    HostConfig: {
      Binds: binds,
      PortBindings: portBindings,
      RestartPolicy: {
        Name: "always",
      },
      NetworkMode: internetNetwork,
    },
    NetworkingConfig: {
      EndpointsConfig: { [internetNetwork]: {} },
    },
    ExposedPorts: exposedPorts,
    Tty: false,
  });

  await syncIngressNetwork(service.id);
  // With NetworkMode "none" it could never join a network later, so it leaves the internet network before it starts
  if (!await hasInternetAccess(db, service.id)) {
    await removeInternetNetwork(service.id, container.id);
  }
  await container.start();
}

export async function stopServiceContainer(service: ServiceIdentity): Promise<void> {
  const container = await findServiceContainer(service);
  if (!container) {
    try {
      const byName = docker.getContainer(`buttler-service-${service.id}`);
      await byName.remove({ force: true });
    } catch {
      // ignore
    }
    return;
  }
  try {
    await container.stop({ t: 10 });
  } catch (err: unknown) {
    const error = err as { statusCode?: number };
    if (error.statusCode !== 304 && error.statusCode !== 404) {
      // ignore
    }
  }
  try {
    await container.remove({ force: true });
  } catch (err: unknown) {
    const error = err as { statusCode?: number };
    if (error.statusCode !== 404) {
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
  await stopServiceContainer(service);
  await startServiceContainer(service);
}
