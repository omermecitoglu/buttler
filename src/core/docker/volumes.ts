import { docker } from "~/core/docker";
import { BUTTLER_VOLUME_LABEL } from "./labels";

/** Returns the names of the volumes that Buttler created, sorted. Volumes from outside are none of its business */
export async function listButtlerVolumes() {
  const { Volumes: volumes } = await docker.listVolumes({ filters: { label: [BUTTLER_VOLUME_LABEL] } });
  return volumes.map(volume => volume.Name).sort((a, b) => a.localeCompare(b));
}
