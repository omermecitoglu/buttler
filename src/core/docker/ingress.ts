import { docker } from "~/core/docker";
import { FORBIDDEN, NOT_FOUND, ignoreStatus } from "./errors";
import { BUTTLER_NETWORK_LABEL, BUTTLER_SERVICE_LABEL } from "./labels";

/** Older versions connected nginx to the services with a domain through these networks, links replace them */
const INGRESS_NETWORK = "ingress";

/** Removes the ingress networks of older versions. Only the containers of services are disconnected. */
export async function removeIngressNetworks(): Promise<void> {
  const networks = await docker.listNetworks({ filters: { label: [`${BUTTLER_NETWORK_LABEL}=${INGRESS_NETWORK}`] } });
  if (networks.length === 0) return;
  const containers = await docker.listContainers({ all: true });
  for (const networkInfo of networks) {
    const network = docker.getNetwork(networkInfo.Id);
    for (const container of containers) {
      if (!(networkInfo.Name in container.NetworkSettings.Networks) || !container.Labels[BUTTLER_SERVICE_LABEL]) continue;
      await ignoreStatus(network.disconnect({ Container: container.Id, Force: true }), NOT_FOUND);
    }
    // Networks that are used by containers from outside of Buttler are kept
    await ignoreStatus(network.remove(), NOT_FOUND, FORBIDDEN);
  }
}
