"use server";
import { redirect } from "next/navigation";
import db from "~/database";
import { NewServiceDTO, ServicePatchDTO } from "~/models/service";
import createService from "~/operations/createService";
import deleteService from "~/operations/deleteService";
import updateService from "~/operations/updateService";
import { getData } from "~/utils/form";

export async function create(formData: FormData) {
  const data = NewServiceDTO.parse(getData(formData));
  await createService(db, data);
  redirect("/services");
}

export async function update(id: string, _: unknown, formData: FormData): Promise<Record<string, string>> {
  const patch = ServicePatchDTO.parse(getData(formData));
  await updateService(db, id, patch);
  redirect("/services");
}

export async function destroy(id: string, _: FormData) {
  await deleteService(db, id);
  redirect("/services");
}
