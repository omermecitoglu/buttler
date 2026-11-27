import { BUTTLER_SERVICE_LABEL } from "./labels";
import type Docker from "dockerode";

export const REVERSE_PROXY_CONTAINER_NAME = "buttler-nginx";

/** The name that the container of a service is reached by, which stays the same when it's replaced */
export function getServiceContainerName(serviceId: string) {
  return `buttler-service-${serviceId}`;
}

/** The temporary name of the replacement, container names are unique */
export function getReplacementContainerName(serviceId: string) {
  return `${getServiceContainerName(serviceId)}-next`;
}

export function hasContainerName(container: Docker.ContainerInfo, name: string) {
  return container.Names.includes(`/${name}`);
}

/** Only matches the containers that are created by Buttler, a container with the name of the service may be unrelated */
export function isOwnContainer(container: Docker.ContainerInfo, serviceId: string) {
  return container.Labels[BUTTLER_SERVICE_LABEL] === serviceId ||
    hasContainerName(container, getServiceContainerName(serviceId));
}
