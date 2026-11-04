import "server-only";
import { kebabCase } from "change-case";
import db from "~/database";
import type { ServiceDTO } from "~/models/service";
import getBuildImages from "~/operations/getBuildImages";
import updateService from "~/operations/updateService";
import { mergeObjects } from "~/utils/object";
import { createContainer, pullImage, removeContainer } from "./docker";
import { getProviderVariables } from "./provider";

async function getLatestBuild(serviceId: ServiceDTO["id"]) {
  const images = await getBuildImages(db, serviceId, ["id", "status", "createdAt"]);
  const readyImages = images.filter(image => image.status === "ready");
  const latest = readyImages.reduce((bestVersion, nextVersion) => {
    const best = new Date(bestVersion.createdAt).getTime();
    const next = new Date(nextVersion.createdAt).getTime();
    return (next > best) ? nextVersion : bestVersion;
  }, readyImages[0]);
  return latest.id;
}

async function getServiceImage(service: ServiceDTO) {
  switch (service.kind) {
    case "git": return await getLatestBuild(service.id);
    case "system":
    case "database": {
      await pullImage(service.repo);
      return service.repo;
    }
  }
}

export async function startService(service: ServiceDTO, readOnlyFiles?: Record<string, string>) {
  const image = await getServiceImage(service);
  const providerVariables = mergeObjects(service.providers.map(provider => {
    return getProviderVariables(service.name, provider.name, provider.repo, provider.variables);
  }));
  const containerId = await createContainer(
    kebabCase(service.name),
    image,
    { ...providerVariables, ...service.environmentVariables },
    service.ports,
    service.volumes,
    [...service.networkIds, ...service.providers.map(provider => provider.networkIds).flat()],
    { readOnlyFiles },
  );
  await updateService(db, service.id, { status: "running", containerId, imageId: image });
}

export async function stopService(serviceId: ServiceDTO["id"], containerId: string) {
  if (containerId) {
    try {
      await removeContainer(containerId);
    } catch {
      // do nothing
    } finally {
      await updateService(db, serviceId, { status: "idle", containerId: null, imageId: null });
    }
  }
}
