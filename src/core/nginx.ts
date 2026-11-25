import path from "node:path";
import db from "~/database";
import ensureReverseProxyService from "~/operations/ensureReverseProxyService";
import getDashboardDomain from "~/operations/getDashboardDomain";
import getDomains from "~/operations/getDomains";
import { docker, executeCommandInContainer, pullImage } from "./docker";
import { REVERSE_PROXY_CONTAINER_NAME } from "./docker/containers";
import { getIngressAlias, syncIngressNetworks } from "./docker/ingress";
import { connectProxyToTunnel } from "./docker/tunnel";
import { HOST_GATEWAY, generateProxyConfig } from "./nginx-conf";
import { createQueue } from "./queue";
import { getFilePath, readFileContent, removeFile, saveFile } from "./storage";
import type { ContainerInspectInfo } from "dockerode";

export { REVERSE_PROXY_CONTAINER_NAME };
export const REVERSE_PROXY_IMAGE = "nginx:alpine";
export const BUTTLER_SERVICE_LABEL = "buttler.service-id";

export type ReverseProxyHealth = {
  exists: boolean,
  running: boolean,
  status: string,
  containerId?: string,
  configValid?: boolean,
};

const CONF_DIR = "nginx/conf.d";
const CONF_FILE = "default.conf";

const EXTRA_HOST = `${HOST_GATEWAY}:host-gateway`;

/** Changes never overlap, otherwise they could restore the config of each other */
const enqueue = createQueue("nginx-queue");

export function getReverseProxyConfDir() {
  return path.dirname(getFilePath(CONF_DIR, CONF_FILE));
}

function isMissing(err: unknown) {
  const error = err as { statusCode?: number, reason?: string };
  return error.statusCode === 404 || error.reason === "no such container";
}

/** A container that keeps crashing can't execute commands, so it doesn't count as running */
async function isReverseProxyRunning() {
  try {
    const { State: state } = await docker.getContainer(REVERSE_PROXY_CONTAINER_NAME).inspect();
    return state.Running && !state.Restarting;
  } catch (error) {
    if (isMissing(error)) return false;
    throw error;
  }
}

/** The port Buttler listens on, Next.js falls back to 3000 */
function getDashboardPort() {
  return Number(process.env.PORT) || 3000;
}

async function runNginx(...args: string[]) {
  const { exitCode, output } = await executeCommandInContainer(REVERSE_PROXY_CONTAINER_NAME, ["nginx", ...args]);
  if (exitCode !== 0) {
    throw new Error(`"nginx ${args.join(" ")}" failed: ${output}`);
  }
}

async function restoreConfig(content: string | null) {
  await (content === null ? removeFile(CONF_DIR, CONF_FILE) : saveFile(CONF_DIR, CONF_FILE, content));
}

type Domain = Awaited<ReturnType<typeof getDomains>>[number];

/** Nginx reads the config when it starts, so it's only tested and reloaded while it's running */
async function applyConfig(domains: Domain[], dashboardHostname: string | null) {
  const previousConfig = await readFileContent(CONF_DIR, CONF_FILE);
  const isRunning = await isReverseProxyRunning();
  await saveFile(CONF_DIR, CONF_FILE, generateProxyConfig(
    domains.map(({ hostname, serviceId, port }) => ({
      hostname,
      host: getIngressAlias(serviceId),
      port,
    })),
    dashboardHostname === null ? null : { hostname: dashboardHostname, port: getDashboardPort() },
  ));
  if (!isRunning) return;
  try {
    await runNginx("-t");
    await runNginx("-s", "reload");
  } catch (error) {
    await restoreConfig(previousConfig);
    throw error;
  }
}

/** Makes Nginx serve the domains in SQLite. The previous config is kept if the new one doesn't work. */
export function syncReverseProxyConfig(databaseInstance: typeof db = db): Promise<void> {
  // The domains may have changed while waiting for other changes
  return enqueue(async () => {
    const [
      domains,
      dashboardHostname,
    ] = await Promise.all([
      getDomains(databaseInstance),
      getDashboardDomain(databaseInstance),
    ]);
    await applyConfig(domains, dashboardHostname);
  });
}

/**
 * Deletes a service after Nginx has stopped serving its domains, so a deletion that fails can be tried again.
 * The domains are served again if the service is kept, which is when the given function returns false or throws.
 */
export function deleteFromReverseProxy(serviceId: string, deleteService: () => Promise<boolean>): Promise<boolean> {
  return enqueue(async () => {
    const [
      domains,
      dashboardHostname,
    ] = await Promise.all([
      getDomains(db),
      getDashboardDomain(db),
    ]);
    const otherDomains = domains.filter(domain => domain.serviceId !== serviceId);
    // Nginx isn't needed to delete the services without a domain
    if (otherDomains.length === domains.length) return deleteService();
    await applyConfig(otherDomains, dashboardHostname);
    let isDeleted = false;
    try {
      isDeleted = await deleteService();
      return isDeleted;
    } finally {
      if (!isDeleted) {
        await applyConfig(domains, dashboardHostname).catch((error: unknown) => {
          // eslint-disable-next-line no-console
          console.error(`Failed to serve the domains of service ${serviceId} again:`, error);
        });
      }
    }
  });
}

/**
 * The containers that were created before the dashboard could have a domain can't reach the host by its name.
 * The ones that were created before the tunnel publish their ports.
 */
function isOutdated({ Config: config, HostConfig: hostConfig }: ContainerInspectInfo) {
  // Containers from outside of Buttler are never replaced
  if (!config.Labels[BUTTLER_SERVICE_LABEL]) return false;
  const extraHosts = (hostConfig.ExtraHosts ?? []) as string[];
  const publishedPorts = Object.keys((hostConfig.PortBindings ?? {}) as Record<string, unknown>);
  return !extraHosts.includes(EXTRA_HOST) || publishedPorts.length > 0;
}

/** Nginx also has to run while the tunnel can't reach it */
async function syncNetworks() {
  await syncIngressNetworks();
  try {
    await connectProxyToTunnel();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to connect the reverse proxy to the tunnel:", error);
  }
}

async function ensureImage() {
  try {
    await docker.getImage(REVERSE_PROXY_IMAGE).inspect();
  } catch {
    await pullImage(REVERSE_PROXY_IMAGE);
  }
}

export async function provisionReverseProxy(options?: { db?: typeof db }) {
  const databaseInstance = options?.db ?? db;
  const service = await ensureReverseProxyService(databaseInstance);

  const container = docker.getContainer(REVERSE_PROXY_CONTAINER_NAME);
  try {
    const info = await container.inspect();
    if (!isOutdated(info)) {
      await syncNetworks();
      await syncReverseProxyConfig(databaseInstance);
      if (!info.State.Running) {
        await container.start();
      }
      return container;
    }
    // The old container keeps running if the image can't be pulled
    await ensureImage();
    await container.remove({ force: true });
  } catch (err: unknown) {
    if (!isMissing(err)) {
      throw err;
    }
  }

  await ensureImage();

  // Docker would create a missing directory as root
  await syncReverseProxyConfig(databaseInstance);

  // No ports are published, the tunnel is the only way in
  const created = await docker.createContainer({
    name: REVERSE_PROXY_CONTAINER_NAME,
    Image: REVERSE_PROXY_IMAGE,
    Labels: {
      "com.docker.compose.project": "buttler",
      [BUTTLER_SERVICE_LABEL]: service.id,
    },
    HostConfig: {
      Binds: [
        `${getReverseProxyConfDir()}:/etc/nginx/conf.d`,
      ],
      ExtraHosts: [EXTRA_HOST],
      RestartPolicy: {
        Name: "always",
      },
    },
    Tty: false,
  });

  await syncNetworks();
  await created.start();
  return created;
}

export async function getReverseProxyHealth(): Promise<ReverseProxyHealth> {
  const container = docker.getContainer(REVERSE_PROXY_CONTAINER_NAME);
  try {
    const info = await container.inspect();
    const running = info.State.Running;
    const status = info.State.Status;
    let configValid: boolean | undefined;
    if (running) {
      try {
        const { exitCode } = await executeCommandInContainer(container.id, ["nginx", "-t"]);
        configValid = exitCode === 0;
      } catch {
        configValid = false;
      }
    }
    return {
      exists: true,
      running,
      status,
      containerId: container.id,
      configValid,
    };
  } catch (err: unknown) {
    if (isMissing(err)) {
      return {
        exists: false,
        running: false,
        status: "missing",
      };
    }
    throw err;
  }
}

// Aliases for compatibility
export const provisionNginx = provisionReverseProxy;
export const getNginxHealth = getReverseProxyHealth;
export const startReverseProxyService = provisionReverseProxy;
