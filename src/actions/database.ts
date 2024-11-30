"use server";
import { snakeCase } from "change-case";
import { Storage } from "megajs";
import { executeCommandInContainer } from "~/core/docker";
import db from "~/database";
import getService from "~/operations/getService";

export async function backup(serviceId: string, containerId: string, _: FormData) {
  const service = await getService(db, serviceId);
  for (const client of service?.clients ?? []) {
    const tableName = snakeCase(client.name);
    const content = await executeCommandInContainer(containerId, ["pg_dump", "-U", "postgres", tableName]);
    const storage = await new Storage({
      email: "...",
      password: "...",
    }).ready;
    const now = new Date();
    const fileName = `${tableName}_${now.toISOString()}.sql`;
    await storage.upload(fileName, content).complete;
  }
}
