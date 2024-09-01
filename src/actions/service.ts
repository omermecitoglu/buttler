"use server";
import { kebabCase } from "change-case";
import { redirect } from "next/navigation";
import { createContainer, removeContainer } from "~/core/docker";
import db from "~/database";
import { NewServiceDTO, ServicePatchDTO } from "~/models/service";
import createService from "~/operations/createService";
import deleteService from "~/operations/deleteService";
import getBuildImages from "~/operations/getBuildImages";
import getService from "~/operations/getService";
import { syncEnvironmentVariables } from "~/operations/syncEnvironmentVariables";
import { syncPorts } from "~/operations/syncPorts";
import updateService from "~/operations/updateService";
import { getData } from "~/utils/form";

export async function create(formData: FormData) {
  const data = NewServiceDTO.parse(getData(formData));
  await createService(db, data);
  redirect("/services");
}

export async function update(id: string, _: unknown, formData: FormData): Promise<Record<string, string>> {
  const env = JSON.parse(formData.get("env") as string) as Record<string, string>;
  const ports = JSON.parse(formData.get("ports") as string) as Record<string, string>;
  const patch = ServicePatchDTO.omit({ repo: true }).parse(getData(formData));
  const outdatedService = await getService(db, id);
  if (!outdatedService) throw new Error("Invalid Service");
  if (outdatedService.containerId) {
    await removeContainer(outdatedService.containerId);
    patch.containerId = null;
  }
  if (outdatedService.status === "running") {
    patch.status = "idle";
  }
  await db.transaction(async tx => {
    await updateService(tx, id, patch);
    await syncEnvironmentVariables(tx, id, env);
    await syncPorts(tx, id, ports);
  });
  redirect("/services");
}

export async function destroy(id: string, _: FormData) {
  await deleteService(db, id);
  redirect("/services");
}

export async function start(serviceId: string, _: FormData) {
  const service = await getService(db, serviceId);
  if (!service) throw new Error("Invalid Service");
  const images = await getBuildImages(db, serviceId, ["id", "createdAt"]);
  const latest = images.reduce((bestVersion, nextVersion) => {
    const best = new Date(bestVersion.createdAt).getTime();
    const next = new Date(nextVersion.createdAt).getTime();
    return (next > best) ? nextVersion : bestVersion;
  }, images[0]);
  const containerId = await createContainer(
    kebabCase(service.name),
    latest.id,
    service.environmentVariables,
    service.ports
  );
  await updateService(db, service.id, { status: "running", containerId });
  redirect(`/services/${serviceId}`);
}

export async function stop(id: string, containerId: string, _: FormData) {
  if (containerId) {
    await removeContainer(containerId);
    await updateService(db, id, { status: "idle", containerId: null });
  }
  redirect(`/services/${id}`);
}
