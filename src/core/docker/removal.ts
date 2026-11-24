import { docker } from "~/core/docker";
import { listServiceImages } from "./builds";
import { BUTTLER_SERVICE_LABEL } from "./labels";

const NOT_MODIFIED = 304;
const NOT_FOUND = 404;
const CONFLICT = 409;

/** Other names are either paths on the host, or not accepted by Docker */
const volumeNamePattern = /^[a-zA-Z0-9][a-zA-Z0-9_.-]+$/;

async function ignoreStatus(promise: Promise<unknown>, ...statusCodes: number[]) {
  try {
    await promise;
  } catch (error) {
    const { statusCode } = error as { statusCode?: number };
    if (!statusCode || !statusCodes.includes(statusCode)) throw error;
  }
}

/** Only removes the containers that are created by Buttler, a container with the name of the service may be unrelated */
export async function removeServiceContainers(serviceId: string) {
  const containers = await docker.listContainers({ all: true });
  const ownContainers = containers.filter(container => {
    return container.Labels[BUTTLER_SERVICE_LABEL] === serviceId ||
      container.Names.includes(`/buttler-service-${serviceId}`);
  });
  for (const { Id: id } of ownContainers) {
    const container = docker.getContainer(id);
    await ignoreStatus(container.stop({ t: 10 }), NOT_MODIFIED, NOT_FOUND);
    await ignoreStatus(container.remove({ force: true }), NOT_FOUND);
  }
}

/** Removes the images that are built for a service, except the ones that other containers run */
export async function removeServiceImages(serviceId: string) {
  for (const { id } of await listServiceImages(serviceId)) {
    // Images with tags from different repositories (e.g. of a renamed service) can't be removed by their ID otherwise
    await ignoreStatus(docker.getImage(id).remove({ force: true }), NOT_FOUND, CONFLICT);
  }
}

/** Removes volumes with their data, except the ones that other containers use */
export async function removeVolumes(names: string[]) {
  for (const name of new Set(names)) {
    if (!volumeNamePattern.test(name)) continue;
    await ignoreStatus(docker.getVolume(name).remove(), NOT_FOUND, CONFLICT);
  }
}
