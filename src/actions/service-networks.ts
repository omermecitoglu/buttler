"use server";
import { redirect } from "next/navigation";
import { createNetwork as createDockerNetwork, destroyNetwork as destroyDockerNetwork } from "~/core/docker";
import db from "~/database";
import createNetwork from "~/operations/createNetwork";
import createServiceLink from "~/operations/createServiceLink";
import deleteNetwork from "~/operations/deleteNetwork";

export async function create(serviceId: string) {
  await db.transaction(async tx => {
    const { id: networkId } = await createNetwork(tx, serviceId, "custom");
    await createDockerNetwork(networkId);
  });
  redirect(`/services/${serviceId}/networks`);
}

export async function destroy(networkId: string, _: FormData) {
  const outputServiceId = await db.transaction(async tx => {
    const { serviceId } = await deleteNetwork(tx, networkId);
    await destroyDockerNetwork(networkId);
    return serviceId;
  });
  redirect(`/services/${outputServiceId}/networks`);
}

export async function connect(serviceId: string, providerId: string, _: FormData) {
  await createServiceLink(db, serviceId, providerId);
  redirect(`/services/${serviceId}/networks`);
}
