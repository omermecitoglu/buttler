import path from "node:path";
import db from "~/database";
import ensureReverseProxyService from "~/operations/ensureReverseProxyService";
import getDomains from "~/operations/getDomains";
import { docker, executeCommandInContainer, pullImage } from "./docker";
import { REVERSE_PROXY_CONTAINER_NAME } from "./docker/containers";
import { getIngressAlias, syncIngressNetworks } from "./docker/ingress";
import { generateProxyConfig } from "./nginx-conf";
import { createQueue } from "./queue";
import { getFilePath, readFileContent, removeFile, saveFile } from "./storage";

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
async function applyConfig(domains: Domain[]) {
  const previousConfig = await readFileContent(CONF_DIR, CONF_FILE);
  const isRunning = await isReverseProxyRunning();
  await saveFile(CONF_DIR, CONF_FILE, generateProxyConfig(domains.map(({ hostname, serviceId, port }) => ({
    hostname,
    host: getIngressAlias(serviceId),
    port,
  }))));
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
  return enqueue(async () => applyConfig(await getDomains(databaseInstance)));
}

/**
 * Deletes a service after Nginx has stopped serving its domains, so a deletion that fails can be tried again.
 * The domains are served again if the service is kept, which is when the given function returns false or throws.
 */
export function deleteFromReverseProxy(serviceId: string, deleteService: () => Promise<boolean>): Promise<boolean> {
  return enqueue(async () => {
    const domains = await getDomains(db);
    const otherDomains = domains.filter(domain => domain.serviceId !== serviceId);
    // Nginx isn't needed to delete the services without a domain
    if (otherDomains.length === domains.length) return deleteService();
    await applyConfig(otherDomains);
    let isDeleted = false;
    try {
      isDeleted = await deleteService();
      return isDeleted;
    } finally {
      if (!isDeleted) {
        await applyConfig(domains).catch((error: unknown) => {
          // eslint-disable-next-line no-console
          console.error(`Failed to serve the domains of service ${serviceId} again:`, error);
        });
      }
    }
  });
}

export async function provisionReverseProxy(options?: { db?: typeof db }) {
  const databaseInstance = options?.db ?? db;
  const service = await ensureReverseProxyService(databaseInstance);

  const container = docker.getContainer(REVERSE_PROXY_CONTAINER_NAME);
  try {
    const info = await container.inspect();
    await syncIngressNetworks();
    await syncReverseProxyConfig(databaseInstance);
    if (!info.State.Running) {
      await container.start();
    }
    return container;
  } catch (err: unknown) {
    if (!isMissing(err)) {
      throw err;
    }
  }

  const image = docker.getImage(REVERSE_PROXY_IMAGE);
  try {
    await image.inspect();
  } catch {
    await pullImage(REVERSE_PROXY_IMAGE);
  }

  // Docker would create a missing directory as root
  await syncReverseProxyConfig(databaseInstance);

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
      PortBindings: {
        "80/tcp": [{ HostPort: process.env.NODE_ENV === "development" ? "8080" : "80" }],
        "443/tcp": [{ HostPort: process.env.NODE_ENV === "development" ? "8443" : "443" }],
      },
      RestartPolicy: {
        Name: "always",
      },
    },
    ExposedPorts: {
      "80/tcp": {},
      "443/tcp": {},
    },
    Tty: false,
  });

  await syncIngressNetworks();
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
