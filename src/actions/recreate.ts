import "server-only";
import {
  isServiceBuilding,
  isServiceDeleting,
  isServiceDeploying,
  isServicePulling,
} from "~/core/docker/status";

/** A build, a pull or a deploy would create the service again while it's deleted */
export function isServiceBusy(serviceId: string) {
  return isServiceBuilding(serviceId) ||
    isServicePulling(serviceId) ||
    isServiceDeploying(serviceId) ||
    isServiceDeleting(serviceId);
}
