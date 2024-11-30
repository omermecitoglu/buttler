"use server";
import { snakeCase } from "change-case";
import { Storage } from "megajs";
import { executeCommandInContainer } from "~/core/docker";

export async function backup(containerId: string, serviceName: string, _: FormData) {
  const content = await executeCommandInContainer(containerId, ["pg_dump", "-U", "postgres", snakeCase(serviceName)]);
  const storage = await new Storage({
    email: "...",
    password: "...",
  }).ready;
  const now = new Date();
  const fileName = `${now.toISOString()}.sql`;
  await storage.upload(fileName, content).complete;
}
