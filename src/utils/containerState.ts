import type { ContainerRuntimeStatus } from "~/core/docker/status";

/**
 * Whether the container of a service can be recreated with saved changes:
 * - `running`: it can, otherwise the changes apply when it's restarted
 * - `busy`: a build or a pull replaces it anyway
 * - `stopped`: there is no running container, the changes apply when it's started
 */
export type ContainerState = "running" | "busy" | "stopped";

export function getContainerState(status: ContainerRuntimeStatus): ContainerState {
  if (status === "building" || status === "pulling") return "busy";
  return status === "running" ? "running" : "stopped";
}
