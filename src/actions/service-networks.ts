"use server";
import { redirect } from "next/navigation";
import { createNetwork as createDockerNetwork, destroyNetwork as destroyDockerNetwork } from "~/core/docker";
import db from "~/database";
import createNetwork from "~/operations/createNetwork";
import createServiceLink from "~/operations/createServiceLink";
import deleteNetwork from "~/operations/deleteNetwork";

export async function create(serviceId: string) {
  try {
    await db.transaction(async tx => {
      const { id: networkId } = await createNetwork(tx, serviceId, "custom");
      await createDockerNetwork(networkId);
    });
  } catch (error) {
    if (error && typeof error === "object" && "message" in error && error.message === "Transaction function cannot return a promise") {
      // do nothing. This is a known bug in Drizzle ORM
      // Check https://github.com/omermecitoglu/buttler/issues/40
    } else {
      throw error;
    }
  }
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
