import "server-only";
import { kebabCase } from "change-case";
import { after } from "next/server";
import { GitError } from "simple-git";
import { buildImage, createContainer, createNetwork, destroyNetwork, removeContainer } from "~/core/docker";
import { cloneRepo, deleteRepo } from "~/core/git";
import db from "~/database";
import type { ServiceDTO } from "~/models/service";
import createBuildImage from "~/operations/createBuildImage";
import updateBuildImage from "~/operations/updateBuildImage";
import updateService from "~/operations/updateService";
import { mergeObjects, pluck } from "~/utils/object";
import env from "./env";
import { getProviderVariables } from "./provider";

export async function startBuilding(service: ServiceDTO) {
  const image = await createBuildImage(db, { serviceId: service.id });
  after(async () => {
    const providerContainerIds = pluck(service.providers, "containerId").filter(c => c !== null);
    const buildNetwork = await createNetwork(`build-${image.id}`, providerContainerIds);
    try {
      const repoPath = await cloneRepo(service.repo, service.id);
      const success = await buildImage(
        image.id,
        repoPath,
        service.environmentVariables,
        buildNetwork.id,
        env.DEBUG_MODE === "yes",
      );
      await deleteRepo(service.id);
      if (success) {
        await updateBuildImage(db, image.id, { status: "ready" });
      } else {
        await updateBuildImage(db, image.id, { status: "failed", errorCode: "BUILD_FAILED" });
      }

      // update container
      if (success && service.containerId) {
        await removeContainer(service.containerId);
        await updateService(db, service.id, { status: "idle", containerId: null, imageId: null });
        const providerVariables = mergeObjects(service.providers.map(provider => {
          return getProviderVariables(service.name, provider.name, provider.repo, provider.variables);
        }));
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
    } catch (error) {
      if (error instanceof GitError && error.message.includes("Repository not found")) {
        await updateBuildImage(db, image.id, { status: "failed", errorCode: "REPO_NOT_FOUND" });
      } else {
        await updateBuildImage(db, image.id, { status: "failed" });
      }
    } finally {
      await destroyNetwork(buildNetwork.id, providerContainerIds);
    }
  });
  return image;
}
