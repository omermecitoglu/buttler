"use server";
import { redirect } from "next/navigation";
import { removeContainer } from "~/core/docker";
import db from "~/database";
import { NewServiceDTO, ServicePatchDTO } from "~/models/service";
import createService from "~/operations/createService";
import deleteService from "~/operations/deleteService";
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
  if (outdatedService.status === "ready") {
    patch.status = "built";
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
