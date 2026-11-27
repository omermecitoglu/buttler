import "server-only";
import { cacheTag } from "next/cache";
import { cache } from "react";
import { findLatestImage } from "~/core/build";
import { getExposedPorts } from "~/core/docker";
import { type ServiceImage, getServiceBuilds, listServiceImages } from "~/core/docker/builds";
import { isVolumeName } from "~/core/docker/removal";
import { type ServiceRuntimeState, getServiceRuntimeState, getServicesRuntimeStates } from "~/core/docker/status";
import { listButtlerVolumes } from "~/core/docker/volumes";
import { getServiceImageTag } from "~/core/dockerhub";
import { buildServiceGraph } from "~/core/service-graph";
import db from "~/database";
import type { ServiceDTO } from "~/models/service";
import { REVERSE_PROXY_SERVICE_NAME } from "~/operations/ensureReverseProxyService";
import getInheritedVariables from "~/operations/getInheritedVariables";
import getService from "~/operations/getService";
import getServiceLinks from "~/operations/getServiceLinks";
import getServices from "~/operations/getServices";
import getSharedVariableNames from "~/operations/getSharedVariableNames";
import getSharedVariables from "~/operations/getSharedVariables";
import getSharedVolumes from "~/operations/getSharedVolumes";
import getVolumeUsers from "~/operations/getVolumeUsers";

export type ServiceWithRuntime = Awaited<ReturnType<typeof getServices>>[number] & {
  runtime: ServiceRuntimeState,
  /** The image that is currently deployed, if it's built by Buttler */
  deployedImage: ServiceImage | null,
};

async function getServiceImages() {
  try {
    return await listServiceImages();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to query Docker images:", error);
    return [];
  }
}

export async function getAllServices() {
  "use cache";
  cacheTag("getAllServices()");
  return await getServices(db);
}

export async function getServicesWithLiveStatus(): Promise<ServiceWithRuntime[]> {
  const serviceList = await getAllServices();
  const [
    runtimeMap,
    images,
  ] = await Promise.all([
    getServicesRuntimeStates(serviceList),
    getServiceImages(),
  ]);
  return serviceList.map(service => ({
    ...service,
    runtime: runtimeMap[service.id],
    deployedImage: images.find(image => image.id === runtimeMap[service.id].imageId) ?? null,
  }));
}

export async function getSingleService(serviceId: ServiceDTO["id"]) {
  "use cache";
  cacheTag(`getSingleService(${serviceId})`);
  cacheTag("getSingleService(...)");
  return await getService(db, serviceId);
}

/** The layout and the page of a service share the result during a request */
export const getServiceWithLiveStatus = cache(async (serviceId: ServiceDTO["id"]) => {
  const item = await getSingleService(serviceId);
  if (!item) return null;
  const [
    runtime,
    images,
  ] = await Promise.all([
    getServiceRuntimeState(item),
    getServiceImages(),
  ]);
  return {
    ...item,
    runtime,
    deployedImage: images.find(image => image.id === runtime.imageId) ?? null,
  };
});

export type ServiceDetails = NonNullable<Awaited<ReturnType<typeof getServiceWithLiveStatus>>>;

export type ServiceVolume = {
  name: string,
  /** Why the volume can't be deleted with the service */
  keptAs: "shared" | "hostPath" | "outside" | null,
};

/** Returns the volumes of a service with whether they can be deleted */
export async function getVolumesOfService(service: Pick<ServiceDetails, "id" | "volumes">): Promise<ServiceVolume[]> {
  const [
    sharedNames,
    ownNames,
  ] = await Promise.all([
    getSharedVolumes(db, service.id),
    listButtlerVolumes(),
  ]);
  const names = [...new Set(service.volumes.map(volume => volume.name))];
  return names.map(name => ({
    name,
    keptAs: getKeptReason(name, sharedNames, ownNames),
  }));
}

function getKeptReason(name: string, sharedNames: string[], ownNames: string[]): ServiceVolume["keptAs"] {
  if (!isVolumeName(name)) return "hostPath";
  // Including the volumes that Buttler created before they were labelled
  if (!ownNames.includes(name)) return "outside";
  if (sharedNames.includes(name)) return "shared";
  return null;
}

export type VolumeOptions = {
  /** The volumes that Buttler created, which can be picked for a storage mount */
  existing: string[],
  /** The other services that mount a volume, by its name */
  usedBy: Record<string, string[]>,
};

/** Returns what the storage mounts of a service can use. Docker is the source of truth, so nothing is cached */
export async function getVolumeOptions(exceptServiceId?: ServiceDTO["id"]): Promise<VolumeOptions> {
  const [
    existing,
    usedBy,
  ] = await Promise.all([
    listButtlerVolumes(),
    getVolumeUsers(db, exceptServiceId),
  ]);
  return { existing, usedBy };
}

/**
 * Returns the TCP ports that the newest image of a service exposes: the latest build of a GitHub service,
 * or the pulled image of a Docker Hub service. Docker is the source of truth, so nothing is cached.
 */
export async function getExposedPortsOfService(service: Pick<ServiceDetails, "id" | "type" | "repository" | "branch">) {
  if (service.type === "github") {
    const imageId = await findLatestImage(service.id).catch(() => null);
    return imageId ? await getExposedPorts(imageId) : [];
  }
  if (service.type === "dockerhub") {
    const imageTag = getServiceImageTag(service);
    return imageTag ? await getExposedPorts(imageTag) : [];
  }
  return [];
}

/** Returns null if the builds are not available */
export async function getBuildsOfService(serviceId: ServiceDTO["id"]) {
  try {
    return await getServiceBuilds(serviceId);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to query the builds:", error);
    return null;
  }
}

/** Both services of a link show it, so a deletion updates all of them with the generic tag */
export async function getLinksOfService(serviceId: ServiceDTO["id"]) {
  "use cache";
  cacheTag(`getLinksOfService(${serviceId})`);
  cacheTag("getLinksOfService(...)");
  return await getServiceLinks(db, serviceId);
}

export async function getSharedVariablesOfService(serviceId: ServiceDTO["id"]) {
  "use cache";
  cacheTag(`getSharedVariablesOfService(${serviceId})`);
  cacheTag("getSharedVariablesOfService(...)");
  return await getSharedVariables(db, serviceId);
}

/**
 * Secrets have no value, so the result is safe to be cached.
 * It depends on the variables and the links of other services, so changes to them update the group tag.
 */
export async function getInheritedVariablesOfService(serviceId: ServiceDTO["id"]) {
  "use cache";
  cacheTag(`getInheritedVariablesOfService(${serviceId})`);
  cacheTag("getInheritedVariablesOfService(...)");
  return await getInheritedVariables(db, serviceId);
}

export async function getSharedVariableNamesOfLink(linkId: string) {
  "use cache";
  cacheTag(`getSharedVariableNamesOfLink(${linkId})`);
  return await getSharedVariableNames(db, linkId);
}

/** The graph of the home page, the actions that change services, links or domains update its tag */
export async function getServiceGraph() {
  "use cache";
  cacheTag("getServiceGraph()");
  const [
    services,
    links,
  ] = await Promise.all([
    getServices(db),
    getServiceLinks(db),
  ]);
  const reverseProxy = services.find(service => service.type === "system" && service.name === REVERSE_PROXY_SERVICE_NAME);
  return buildServiceGraph(services, links, reverseProxy?.id ?? null);
}
