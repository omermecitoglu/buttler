import "server-only";
import { cacheTag } from "next/cache";
import { serviceCT, serviceIdsCT } from "~/core/cache";
import { type ServiceRuntimeState, getServiceRuntimeState, getServicesRuntimeStates } from "~/core/docker/status";
import db from "~/database";
import type { ServiceDTO } from "~/models/service";
import getService from "~/operations/getService";
import getServices from "~/operations/getServices";

export type ServiceWithRuntime = Awaited<ReturnType<typeof getServices>>[number] & {
  runtime: ServiceRuntimeState,
};

export async function getAllServices() {
  "use cache";
  cacheTag(serviceIdsCT());
  return await getServices(db);
}

export async function getServicesWithLiveStatus(): Promise<ServiceWithRuntime[]> {
  const serviceList = await getAllServices();
  const runtimeMap = await getServicesRuntimeStates(serviceList);
  return serviceList.map(service => ({
    ...service,
    runtime: runtimeMap[service.id],
  }));
}

export async function getSingleService(serviceId: ServiceDTO["id"]) {
  "use cache";
  cacheTag(serviceCT(serviceId));
  const item = await getService(db, serviceId);
  if (!item) throw new Error(`Service not found (${serviceId})`);
  return item;
}

export async function getServiceWithLiveStatus(serviceId: ServiceDTO["id"]) {
  const item = await getSingleService(serviceId);
  const runtime = await getServiceRuntimeState(item);
  return {
    ...item,
    runtime,
  };
}

export function getSpecificServices(ids: ServiceDTO["id"][]) {
  return Promise.all(ids.map(id => getSingleService(id)));
}
