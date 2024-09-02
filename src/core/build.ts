import "server-only";
import { kebabCase } from "change-case";
import { buildImage, createContainer, removeContainer } from "~/core/docker";
import { cloneRepo, deleteRepo } from "~/core/git";
import db from "~/database";
import type { ServiceDTO } from "~/models/service";
import createBuildImage from "~/operations/createBuildImage";
import updateBuildImage from "~/operations/updateBuildImage";
import updateService from "~/operations/updateService";
import type z from "zod";

async function buildInTheBackground(service: z.infer<typeof ServiceDTO>, imageId: string) {
  const repoPath = await cloneRepo(service.repo, service.id);
  const success = await buildImage(imageId, repoPath, false);
  await deleteRepo(service.id);
  await updateBuildImage(db, imageId, { status: success ? "ready" : "failed" });

  // update container
  if (service.containerId) {
    await removeContainer(service.containerId);
    await updateService(db, service.id, { status: "idle", containerId: null, imageId: null });
    const containerId = await createContainer(
      kebabCase(service.name),
      imageId,
      service.environmentVariables,
      service.ports
    );
    await updateService(db, service.id, { status: "running", containerId, imageId: imageId });
  }
}

export async function startBuilding(service: z.infer<typeof ServiceDTO>) {
  const image = await createBuildImage(db, { serviceId: service.id });
  buildInTheBackground(service, image.id);
  return image;
}
