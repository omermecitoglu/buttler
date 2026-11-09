import path from "node:path";
import db from "~/database";
import ensureReverseProxyService from "~/operations/ensureReverseProxyService";
import { docker, executeCommandInContainer, pullImage } from "./docker";
import { generateBaselineProxyConfig } from "./nginx-conf";
import { checkFile, getFilePath, saveFile } from "./storage";

export const REVERSE_PROXY_CONTAINER_NAME = "buttler-nginx";
export const REVERSE_PROXY_IMAGE = "nginx:alpine";
export const BUTTLER_SERVICE_LABEL = "buttler.service-id";

export type ReverseProxyHealth = {
  exists: boolean,
  running: boolean,
  status: string,
  containerId?: string,
  configValid?: boolean,
};

export function getReverseProxyConfDir() {
  return path.dirname(getFilePath("nginx/conf.d", "default.conf"));
}

export async function ensureBaselineProxyConfig() {
  const hasConfig = await checkFile("nginx/conf.d", "default.conf");
  if (!hasConfig) {
    await saveFile("nginx/conf.d", "default.conf", generateBaselineProxyConfig());
  }
  return getReverseProxyConfDir();
}

export async function provisionReverseProxy(options?: { db?: typeof db }) {
  const databaseInstance = options?.db ?? db;
  const service = await ensureReverseProxyService(databaseInstance);
  const confDir = await ensureBaselineProxyConfig();

  const container = docker.getContainer(REVERSE_PROXY_CONTAINER_NAME);
  try {
    const info = await container.inspect();
    if (!info.State.Running) {
      await container.start();
    }
    return container;
  } catch (err: unknown) {
    const error = err as { statusCode?: number, reason?: string };
    if (error.statusCode !== 404 && error.reason !== "no such container") {
      throw err;
    }
  }

  const image = docker.getImage(REVERSE_PROXY_IMAGE);
  try {
    await image.inspect();
  } catch {
    await pullImage(REVERSE_PROXY_IMAGE);
  }

  const created = await docker.createContainer({
    name: REVERSE_PROXY_CONTAINER_NAME,
    Image: REVERSE_PROXY_IMAGE,
    Labels: {
      [BUTTLER_SERVICE_LABEL]: service.id,
    },
    HostConfig: {
      Binds: [
        `${confDir}:/etc/nginx/conf.d`,
      ],
      PortBindings: {
        "80/tcp": [{ HostPort: "80" }],
        "443/tcp": [{ HostPort: "443" }],
      },
      RestartPolicy: {
        Name: "always",
      },
    },
    ExposedPorts: {
      "80/tcp": {},
      "443/tcp": {},
    },
    Tty: true,
  });

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
        const testOutput = await executeCommandInContainer(container.id, ["nginx", "-t"]);
        configValid = testOutput.includes("syntax is ok") || testOutput.includes("successful");
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
    const error = err as { statusCode?: number, reason?: string };
    if (error.statusCode === 404 || error.reason === "no such container") {
      return {
        exists: false,
        running: false,
        status: "missing",
      };
    }
    throw err;
  }
}

export async function reloadReverseProxy(): Promise<{ success: boolean, output: string }> {
  const health = await getReverseProxyHealth();
  if (!health.exists || !health.running || !health.containerId) {
    await provisionReverseProxy();
    return { success: true, output: "Reverse proxy provisioned and started" };
  }

  const testOutput = await executeCommandInContainer(health.containerId, ["nginx", "-t"]);
  if (!testOutput.includes("syntax is ok") && !testOutput.includes("successful")) {
    throw new Error(`Reverse proxy configuration test failed: ${testOutput}`);
  }

  const reloadOutput = await executeCommandInContainer(health.containerId, ["nginx", "-s", "reload"]);
  return { success: true, output: reloadOutput };
}

// Aliases for compatibility
export const provisionNginx = provisionReverseProxy;
export const getNginxHealth = getReverseProxyHealth;
export const reloadNginx = reloadReverseProxy;
export const startReverseProxyService = provisionReverseProxy;
export const reloadReverseProxyService = reloadReverseProxy;
