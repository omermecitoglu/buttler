import "server-only";
import { cacheTag } from "next/cache";
import { type ServiceImage, listServiceImages } from "~/core/docker/builds";
import { type ServiceRuntimeState, getServiceRuntimeState, getServicesRuntimeStates } from "~/core/docker/status";
import db from "~/database";
import type { ServiceDTO } from "~/models/service";
import getService from "~/operations/getService";
import getServices from "~/operations/getServices";

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
  const item = await getService(db, serviceId);
  if (!item) throw new Error(`Service not found (${serviceId})`);
  return item;
}

export async function getServiceWithLiveStatus(serviceId: ServiceDTO["id"]) {
  const item = await getSingleService(serviceId);
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
}

export function getSpecificServices(ids: ServiceDTO["id"][]) {
  return Promise.all(ids.map(id => getSingleService(id)));
}
