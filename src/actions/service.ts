"use server";
import { revalidatePath } from "next/cache";
import { restartServiceContainer, startServiceContainer, stopServiceContainer } from "~/core/docker/status";
import db from "~/database";
import getService from "~/operations/getService";

export async function startService(serviceId: string) {
  const service = await getService(db, serviceId);
  if (!service) {
    throw new Error(`Service not found: ${serviceId}`);
  }
  await startServiceContainer(service);
  revalidatePath("/");
  revalidatePath("/services");
  return { success: true };
}

export async function stopService(serviceId: string) {
  const service = await getService(db, serviceId);
  if (!service) {
    throw new Error(`Service not found: ${serviceId}`);
  }
  await stopServiceContainer(service);
  revalidatePath("/");
  revalidatePath("/services");
  return { success: true };
}

export async function restartService(serviceId: string) {
  const service = await getService(db, serviceId);
  if (!service) {
    throw new Error(`Service not found: ${serviceId}`);
  }
  await restartServiceContainer(service);
  revalidatePath("/");
  revalidatePath("/services");
  return { success: true };
}

// NOTE (v2 roadmap): Legacy v1 service server actions.
// Services and operations are being redesigned from scratch in Phase 3.

export async function create(_formData: FormData) {
  // Deprecated in v2
}

export async function update(_id: string, _: unknown, _formData: FormData): Promise<Record<string, string>> {
  return {};
}

export async function destroy(_id: string, _: FormData) {
  // Deprecated in v2
}

export async function start(_serviceId: string, _: FormData) {
  // Deprecated in v2
}

export async function stop(_serviceId: string, _containerId: string, _: FormData) {
  // Deprecated in v2
}

export async function build(_id: string, _: FormData) {
  // Deprecated in v2
}

export async function attachDatabase(_serviceId: string, _databaseId: string, _: FormData) {
  // Deprecated in v2
}

export async function detachDatabase(_serviceId: string, _databaseId: string, _: FormData) {
  // Deprecated in v2
}
