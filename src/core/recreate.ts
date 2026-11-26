import "server-only";
import {
  getServiceRuntimeState,
  isServiceBuilding,
  isServiceDeleting,
  isServiceDeploying,
  isServicePulling,
  restartServiceContainer,
} from "~/core/docker/status";
import db from "~/database";
import getDeployableService from "~/operations/getDeployableService";

/** A build, a pull or a deploy would create the service again while it's deleted */
export function isServiceBusy(serviceId: string) {
  return isServiceBuilding(serviceId) ||
    isServicePulling(serviceId) ||
    isServiceDeploying(serviceId) ||
    isServiceDeleting(serviceId);
}

/**
 * Creates the containers of the running services again, so they get their new variables.
 * Stopped services get them when they are started. Returns the services that couldn't be recreated.
 */
export async function recreateRunningServices(serviceIds: string[]) {
  const failed: string[] = [];
  for (const serviceId of serviceIds) {
    const service = await getDeployableService(db, serviceId);
    if (!service) continue;
    try {
      const { status } = await getServiceRuntimeState(service);
      if (status !== "running") continue;
      // The container is replaced anyway, and replacing it at the same time would fail
      if (isServiceBusy(serviceId)) throw new Error("The service is busy");
      await restartServiceContainer(service);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Failed to recreate the container of service ${serviceId}:`, error);
      failed.push(serviceId);
    }
  }
  return failed;
}
