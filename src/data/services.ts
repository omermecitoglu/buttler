import "server-only";
import { cacheTag } from "next/cache";
import { serviceCT, serviceIdsCT } from "~/core/cache";
import db from "~/database";
import type { ServiceDTO } from "~/models/service";
import getService from "~/operations/getService";
import getServices from "~/operations/getServices";

export async function getAllServices() {
  "use cache";
  cacheTag(serviceIdsCT());
  return await getServices(db);
}

export async function getSingleService(serviceId: ServiceDTO["id"]) {
  "use cache";
  cacheTag(serviceCT(serviceId));
  const item = await getService(db, serviceId);
  if (!item) throw new Error(`Service not found (${serviceId})`);
  return item;
}

export function getSpecificServices(ids: ServiceDTO["id"][]) {
  return Promise.all(ids.map(id => getSingleService(id)));
}
