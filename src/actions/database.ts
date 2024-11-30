"use server";
import { executeCommandInContainer } from "~/core/docker";

export async function backup(containerId: string, _: FormData) {
  const dump = await executeCommandInContainer(containerId, ["pg_dump", "-U", "postgres", "tusmate_api"]);
  console.log(dump);
}
