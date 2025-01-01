import "server-only";
import { kebabCase } from "change-case";
import { after } from "next/server";
import { buildImage, createContainer, removeContainer } from "~/core/docker";
import { cloneRepo, deleteRepo } from "~/core/git";
import db from "~/database";
import type { ServiceDTO } from "~/models/service";
import createBuildImage from "~/operations/createBuildImage";
import updateBuildImage from "~/operations/updateBuildImage";
import updateService from "~/operations/updateService";
import { getProviderVariables } from "./provider";

export async function startBuilding(service: ServiceDTO) {
  const image = await createBuildImage(db, { serviceId: service.id });
  after(async () => {
    const repoPath = await cloneRepo(service.repo, service.id);
    const success = await buildImage(image.id, repoPath, false);
    await deleteRepo(service.id);
    await updateBuildImage(db, image.id, { status: success ? "ready" : "failed" });

    // update container
    if (service.containerId) {
      await removeContainer(service.containerId);
      await updateService(db, service.id, { status: "idle", containerId: null, imageId: null });
      const providerVariables = service.providers
        .map(provider => getProviderVariables(service.name, provider.name, provider.variables))
        .reduce((bundle, current) => Object.assign(bundle, current), {});
      const containerId = await createContainer(
        kebabCase(service.name),
        image.id,
        { ...providerVariables, ...service.environmentVariables },
        service.ports,
        service.volumes,
        service.providers.map(provider => provider.networkIds).flat(),
      );
      await updateService(db, service.id, { status: "running", containerId, imageId: image.id });
    }
  });
  return image;
}
