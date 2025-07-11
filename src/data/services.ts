import "server-only";
import { cacheTag, serviceCT, serviceIdsCT } from "~/core/cache";
import db from "~/database";
import type { ServiceDTO } from "~/models/service";
import getService from "~/operations/getService";
import getServices from "~/operations/getServices";

async function getAllServiceIds() {
  // "use cache";
  cacheTag(serviceIdsCT());
  return await getServices(db, ["id"]);
}

export async function getSingleService(serviceId: ServiceDTO["id"]) {
  // "use cache";
  cacheTag(serviceCT(serviceId));
  const item = await getService(db, serviceId);
  if (!item) throw new Error(`Service not found (${serviceId})`);
  return item;
}

export async function getAllServices() {
  const list = await getAllServiceIds();
  return await Promise.all(list.map(item => getSingleService(item.id)));
}

export function getSpecificServices(ids: ServiceDTO["id"][]) {
  return Promise.all(ids.map(id => getSingleService(id)));
}
