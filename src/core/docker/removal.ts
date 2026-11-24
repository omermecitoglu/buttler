import { docker } from "~/core/docker";
import { listServiceImages } from "./builds";
import { isOwnContainer } from "./containers";
import { CONFLICT, NOT_FOUND, NOT_MODIFIED, ignoreStatus } from "./errors";

const volumeNamePattern = /^[a-zA-Z0-9][a-zA-Z0-9_.-]+$/;

/** Other names are either paths on the host, or not accepted by Docker */
export function isVolumeName(name: string) {
  return volumeNamePattern.test(name);
}

/** Only removes the containers that are created by Buttler, a container with the name of the service may be unrelated */
export async function removeServiceContainers(serviceId: string) {
  const containers = await docker.listContainers({ all: true });
  for (const { Id: id } of containers.filter(info => isOwnContainer(info, serviceId))) {
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
    if (!isVolumeName(name)) continue;
    await ignoreStatus(docker.getVolume(name).remove(), NOT_FOUND, CONFLICT);
  }
}
