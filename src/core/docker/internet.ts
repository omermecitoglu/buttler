import { docker } from "~/core/docker";
import { createQueue } from "~/core/queue";
import { FORBIDDEN, NOT_FOUND, ignoreStatus } from "./errors";
import { BUTTLER_NETWORK_LABEL, BUTTLER_SERVICE_LABEL } from "./labels";
import { createButtlerNetwork } from "./networks";

const INTERNET_NETWORK = "internet";
const ISOLATED_NETWORK = "isolated";

type ServiceNetworkKind = typeof INTERNET_NETWORK | typeof ISOLATED_NETWORK;

/** Two deploys of the same service must not create two networks */
const enqueue = createQueue("internet-queue");

function getServiceNetworkKind(internetAccess: boolean): ServiceNetworkKind {
  return internetAccess ? INTERNET_NETWORK : ISOLATED_NETWORK;
}

/** Only returns the networks that are created by Buttler */
function listServiceNetworks(serviceId: string, kind: ServiceNetworkKind) {
  return docker.listNetworks({
    filters: {
      label: [
        `${BUTTLER_NETWORK_LABEL}=${kind}`,
        `${BUTTLER_SERVICE_LABEL}=${serviceId}`,
      ],
    },
  });
}

/**
 * Returns the network that only the service is on, it's created if it's missing.
 * It reaches the outside only if the service has internet access.
 */
export function ensureServiceNetwork(serviceId: string, internetAccess: boolean): Promise<string> {
  return enqueue(async () => {
    const kind = getServiceNetworkKind(internetAccess);
    const network = (await listServiceNetworks(serviceId, kind)).at(0);
    if (network) return network.Name;
    const name = `buttler-${kind}-${serviceId}`;
    await createButtlerNetwork({
      Name: name,
      Driver: "bridge",
      Internal: !internetAccess,
      Labels: {
        "com.docker.compose.project": "buttler",
        [BUTTLER_NETWORK_LABEL]: kind,
        [BUTTLER_SERVICE_LABEL]: serviceId,
      },
    });
    return name;
  });
}

/** Removes the networks of the service, except the one that matches the given internet access */
export function removeServiceNetworks(serviceId: string, keptInternetAccess?: boolean): Promise<void> {
  return enqueue(async () => {
    const kinds = [INTERNET_NETWORK, ISOLATED_NETWORK] as const;
    const keptKind = keptInternetAccess === undefined ? null : getServiceNetworkKind(keptInternetAccess);
    for (const kind of kinds.filter(k => k !== keptKind)) {
      for (const networkInfo of await listServiceNetworks(serviceId, kind)) {
        // Networks that are still used by a container are kept
        await ignoreStatus(docker.getNetwork(networkInfo.Id).remove(), NOT_FOUND, FORBIDDEN);
      }
    }
  });
}
