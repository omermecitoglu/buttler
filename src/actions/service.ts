"use server";
import db from "~/database";
import { NewServiceDTO, ServicePatchDTO } from "~/models/service";
import createService from "~/operations/createService";
import deleteService from "~/operations/deleteService";
import updateService from "~/operations/updateService";

export async function create(formData: FormData) {
  const data = NewServiceDTO.parse(formData);
  await createService(db, data);
}

export async function update(id: string, formData: FormData) {
  const patch = ServicePatchDTO.parse(formData);
  await updateService(db, id, patch);
}

export async function destroy(id: string, _: FormData) {
  await deleteService(db, id);
}
