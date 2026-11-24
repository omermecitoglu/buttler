import { docker } from "~/core/docker";
import { type ServiceEnvironmentVariable, getRuntimeVariables } from "~/core/environment-variables";
import type Docker from "dockerode";

export const BUTTLER_SERVICE_LABEL = "buttler.service-id";

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
  status: ContainerRuntimeStatus,
  state: string,
  uptime: string | null,
  startedAt: string | null,
  ipAddresses: string[],
  ports: ContainerPortBinding[],
};

const activeBuildServices = new Set<string>();
const activePullServices = new Set<string>();

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
    const reverseProxy = containers.find(c => c.Names.some(n => n === "/buttler-nginx" || n === "buttler-nginx"));
    if (reverseProxy) return reverseProxy;
  }

  const expectedName = `buttler-service-${service.id}`;
  const byServiceIdName = containers.find(c => c.Names.some(n => n === `/${expectedName}` || n === expectedName));
  if (byServiceIdName) return byServiceIdName;

  if (service.name) {
    const sanitizedName = service.name.toLowerCase().replace(/[^a-z0-9_-]/g, "-");
    const byName = containers.find(c => c.Names.some(n => n === `/${service.name}` ||
      n === `/${sanitizedName}` ||
      n === `/buttler-${sanitizedName}`));
    if (byName) return byName;
  }

  return undefined;
}

export function createServiceRuntimeState(
  serviceId: string,
  container?: Docker.ContainerInfo,
): ServiceRuntimeState {
  if (isServicePulling(serviceId)) {
    return {
      containerId: container?.Id ?? null,
      containerName: container?.Names[0]?.replace(/^\//, "") ?? null,
      status: "pulling",
      state: "pulling",
      uptime: null,
      startedAt: null,
      ipAddresses: extractContainerIpAddresses(container),
      ports: extractContainerPorts(container),
    };
  }

  if (isServiceBuilding(serviceId)) {
    return {
      containerId: container?.Id ?? null,
      containerName: container?.Names[0]?.replace(/^\//, "") ?? null,
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

  const result: Record<string, ServiceRuntimeState> = {};
  for (const service of services) {
    const matched = matchContainerForService(service, containers);
    result[service.id] = createServiceRuntimeState(service.id, matched);
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
  if (service.type === "system" && service.name === "Reverse Proxy Server") {
    const { provisionReverseProxy } = await import("~/core/nginx");
    await provisionReverseProxy();
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

  const rawImage = service.repository ?? "";
  const imageTag = rawImage
    ? (service.branch ? `${rawImage}:${service.branch}` : (rawImage.includes(":") ? rawImage : `${rawImage}:latest`))
    : "";

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

/** Replaces the container of a service (if there is any) with a new one that runs the given image */
export async function deployServiceContainer(service: ServiceRef, image: string): Promise<void> {
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
    },
    ExposedPorts: exposedPorts,
    Tty: true,
  });

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
  if (service.type === "system" && service.name === "Reverse Proxy Server") {
    const { provisionReverseProxy } = await import("~/core/nginx");
    await provisionReverseProxy();
    return;
  }
  await stopServiceContainer(service);
  await startServiceContainer(service);
}
