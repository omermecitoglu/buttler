import type Docker from "dockerode";
import { docker } from "~/core/docker";

export const BUTTLER_SERVICE_LABEL = "buttler.service-id";

export type ContainerRuntimeStatus = "running" | "stopped" | "exited" | "building" | "restarting";

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

export function parseContainerRuntimeStatus(container?: Docker.ContainerInfo): ContainerRuntimeStatus {
  if (!container) return "stopped";

  const state = container.State?.toLowerCase() ?? "";
  if (state === "running") return "running";
  if (state === "restarting") return "restarting";
  if (state === "created" || state === "paused") return "stopped";
  if (state === "exited") {
    if (container.Status?.startsWith("Exited (0)")) {
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
  if (!container?.NetworkSettings?.Networks) return [];
  return Object.values(container.NetworkSettings.Networks)
    .map(network => network.IPAddress)
    .filter(Boolean);
}

export function matchContainerForService(
  service: { id: string, name?: string, type?: string },
  containers: Docker.ContainerInfo[],
): Docker.ContainerInfo | undefined {
  const byLabel = containers.find(c => c.Labels && c.Labels[BUTTLER_SERVICE_LABEL] === service.id);
  if (byLabel) return byLabel;

  if (service.type === "system" && service.name === "Reverse Proxy Server") {
    const reverseProxy = containers.find(c => c.Names?.some(n => n === "/buttler-nginx" || n === "buttler-nginx"));
    if (reverseProxy) return reverseProxy;
  }

  if (service.name) {
    const sanitizedName = service.name.toLowerCase().replace(/[^a-z0-9_-]/g, "-");
    const byName = containers.find(c => c.Names?.some(n =>
      n === `/${service.name}` ||
      n === `/${sanitizedName}` ||
      n === `/buttler-${sanitizedName}`,
    ));
    if (byName) return byName;
  }

  return undefined;
}

export function createServiceRuntimeState(
  serviceId: string,
  container?: Docker.ContainerInfo,
): ServiceRuntimeState {
  if (isServiceBuilding(serviceId)) {
    return {
      containerId: container?.Id ?? null,
      containerName: container?.Names?.[0]?.replace(/^\//, "") ?? null,
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
    containerName: container.Names?.[0]?.replace(/^\//, "") ?? null,
    status: parseContainerRuntimeStatus(container),
    state: container.State ?? "unknown",
    uptime: formatContainerUptime(container.Status),
    startedAt: null,
    ipAddresses: extractContainerIpAddresses(container),
    ports: extractContainerPorts(container),
  };
}

export async function getServicesRuntimeStates(
  services: Array<{ id: string, name?: string, type?: string }>,
): Promise<Record<string, ServiceRuntimeState>> {
  let containers: Docker.ContainerInfo[] = [];
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

export async function getServiceRuntimeState(
  service: { id: string, name?: string, type?: string },
): Promise<ServiceRuntimeState> {
  const map = await getServicesRuntimeStates([service]);
  return map[service.id];
}

export async function findServiceContainer(
  service: { id: string, name?: string, type?: string },
): Promise<Docker.Container | null> {
  let containers: Docker.ContainerInfo[] = [];
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

export async function startServiceContainer(
  service: { id: string, name?: string, type?: string },
): Promise<void> {
  if (service.type === "system" && service.name === "Reverse Proxy Server") {
    const { provisionReverseProxy } = await import("~/core/nginx");
    await provisionReverseProxy();
    return;
  }
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
}

export async function stopServiceContainer(
  service: { id: string, name?: string, type?: string },
): Promise<void> {
  const container = await findServiceContainer(service);
  if (!container) {
    throw new Error(`No container found for service ${service.id}`);
  }
  try {
    await container.stop();
  } catch (err: unknown) {
    const error = err as { statusCode?: number };
    if (error.statusCode !== 304) {
      throw err;
    }
  }
}

export async function restartServiceContainer(
  service: { id: string, name?: string, type?: string },
): Promise<void> {
  const container = await findServiceContainer(service);
  if (!container) {
    if (service.type === "system" && service.name === "Reverse Proxy Server") {
      const { provisionReverseProxy } = await import("~/core/nginx");
      await provisionReverseProxy();
      return;
    }
    throw new Error(`No container found for service ${service.id}`);
  }
  await container.restart();
}
