import { getAllServices, getSingleService } from "~/data/services";
import db from "~/database";
import createService from "~/operations/createService";
import { getHostIp } from "./docker";
import { generateNginxConfig } from "./nginx-conf";
import { startService, stopService } from "./service";
import { checkFile, getFilePath, saveFile } from "./storage";

/* eslint-disable no-console */

async function findOrCreateReverseProxyServer() {
  const allServices = await getAllServices();
  const foundService = allServices.find(s => s.kind === "system" && s.repo === "nginx");
  if (foundService) return foundService;
  console.log("\x1b[34m%s\x1b[0m", "the Reverse Proxy Server was not found, creating one...");
  const createdService = await createService(db, {
    kind: "system",
    name: "Reverse Proxy Server",
    repo: "nginx",
  });
  return getSingleService(createdService.id);
}

export async function startReverseProxyService() {
  const service = await findOrCreateReverseProxyServer();
  if (service.status === "running" && service.containerId) {
    await stopService(service.id, service.containerId);
    service.status = "idle";
  }
  if (service.status === "idle") {
    const hostIp = await getHostIp();
    const nginxConfig = await saveFile("system", "nginx.conf", generateNginxConfig(hostIp));
    if (!(await checkFile("system/ssl", "ssl-certificate.pem"))) {
      console.log("\x1b[33m%s\x1b[0m", "ssl-certificate.pem is missing! so the Reverse Proxy Server wasn't launched");
      return;
    }
    if (!(await checkFile("system/ssl", "ssl-certificate-key.pem"))) {
      console.log("\x1b[33m%s\x1b[0m", "ssl-certificate-key.pem is missing! so the Reverse Proxy Server wasn't launched");
      return;
    }
    if (!(await checkFile("system/ssl", "ssl-client-certificate.crt"))) {
      console.log("\x1b[33m%s\x1b[0m", "ssl-client-certificate.crt is missing! so the Reverse Proxy Server wasn't launched");
      return;
    }
    console.log("\x1b[32m%s\x1b[0m", "Starting the Reverse Proxy Server...");
    await startService(service, {
      [nginxConfig]: "/etc/nginx/nginx.conf",
      [getFilePath("system/ssl", "ssl-certificate.pem")]: "/etc/ssl/cert.pem",
      [getFilePath("system/ssl", "ssl-certificate-key.pem")]: "/etc/ssl/key.pem",
      [getFilePath("system/ssl", "ssl-client-certificate.crt")]: "/etc/ssl/cloudflare.crt",
    });
  }
}
