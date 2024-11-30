"use server";
import { backupDatabase } from "~/core/backup";

export async function backup(serviceId: string, _: FormData) {
  await backupDatabase(serviceId);
}
