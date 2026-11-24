import { BUTTLER_SERVICE_LABEL } from "./labels";
import type Docker from "dockerode";

export const REVERSE_PROXY_CONTAINER_NAME = "buttler-nginx";

/** Only matches the containers that are created by Buttler, a container with the name of the service may be unrelated */
export function isOwnContainer(container: Docker.ContainerInfo, serviceId: string) {
  return container.Labels[BUTTLER_SERVICE_LABEL] === serviceId ||
    container.Names.includes(`/buttler-service-${serviceId}`);
}
