import { docker } from "~/core/docker";
import { createQueue } from "~/core/queue";
import { FORBIDDEN, NOT_FOUND, ignoreStatus } from "./errors";
import { BUTTLER_NETWORK_LABEL, BUTTLER_SERVICE_LABEL } from "./labels";
import { createButtlerNetwork } from "./networks";

const INTERNET_NETWORK = "internet";

/** Two deploys of the same service must not create two networks */
const enqueue = createQueue("internet-queue");

function getInternetNetworkName(serviceId: string) {
  return `buttler-internet-${serviceId}`;
}

/** Only returns the networks that are created by Buttler */
function listInternetNetworks(serviceId: string) {
  return docker.listNetworks({
    filters: {
      label: [
        `${BUTTLER_NETWORK_LABEL}=${INTERNET_NETWORK}`,
        `${BUTTLER_SERVICE_LABEL}=${serviceId}`,
      ],
    },
  });
}

/** Returns the network that only the service is on and that reaches the outside, it's created if it's missing */
export function ensureInternetNetwork(serviceId: string): Promise<string> {
  return enqueue(async () => {
    const network = (await listInternetNetworks(serviceId)).at(0);
    if (network) return network.Name;
    const name = getInternetNetworkName(serviceId);
    await createButtlerNetwork({
      Name: name,
      Driver: "bridge",
      Labels: {
        "com.docker.compose.project": "buttler",
        [BUTTLER_NETWORK_LABEL]: INTERNET_NETWORK,
        [BUTTLER_SERVICE_LABEL]: serviceId,
      },
    });
    return name;
  });
}

/** Disconnects the given container from the internet network of the service, and removes the network */
export function removeInternetNetwork(serviceId: string, containerId?: string): Promise<void> {
  return enqueue(async () => {
    for (const networkInfo of await listInternetNetworks(serviceId)) {
      const network = docker.getNetwork(networkInfo.Id);
      if (containerId) {
        await ignoreStatus(network.disconnect({ Container: containerId, Force: true }), NOT_FOUND);
      }
      // Networks that are still used by a container are kept
      await ignoreStatus(network.remove(), NOT_FOUND, FORBIDDEN);
    }
  });
}
