import "server-only";
import { cacheTag } from "next/cache";
import { cache } from "react";
import { type ServiceImage, getServiceBuilds, listServiceImages } from "~/core/docker/builds";
import { isVolumeName } from "~/core/docker/removal";
import { type ServiceRuntimeState, getServiceRuntimeState, getServicesRuntimeStates } from "~/core/docker/status";
import db from "~/database";
import type { ServiceDTO } from "~/models/service";
import getService from "~/operations/getService";
import getServiceLinks from "~/operations/getServiceLinks";
import getServices from "~/operations/getServices";
import getSharedVolumes from "~/operations/getSharedVolumes";

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
  keptAs: "shared" | "hostPath" | null,
};

/** Returns the volumes of a service with whether they can be deleted */
export async function getVolumesOfService(service: Pick<ServiceDetails, "id" | "volumes">): Promise<ServiceVolume[]> {
  const sharedNames = await getSharedVolumes(db, service.id);
  const names = [...new Set(service.volumes.map(volume => volume.name))];
  return names.map(name => ({
    name,
    keptAs: !isVolumeName(name) ? "hostPath" : sharedNames.includes(name) ? "shared" : null,
  }));
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
