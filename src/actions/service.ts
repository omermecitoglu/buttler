"use server";
import { kebabCase } from "change-case";
import { redirect } from "next/navigation";
import { startBuilding } from "~/core/build";
import { createContainer, createNetwork as createDockerNetwork, createVolume as createDockerVolume, destroyNetwork, removeContainer } from "~/core/docker";
import db from "~/database";
import { NewServiceDTO, ServicePatchDTO } from "~/models/service";
import createNetwork from "~/operations/createNetwork";
import createService from "~/operations/createService";
import createServiceLink from "~/operations/createServiceLink";
import createVolume from "~/operations/createVolume";
import deleteService from "~/operations/deleteService";
import deleteServiceLink from "~/operations/deleteServiceLink";
import getBuildImages from "~/operations/getBuildImages";
import getService from "~/operations/getService";
import { syncEnvironmentVariables } from "~/operations/syncEnvironmentVariables";
import { syncPorts } from "~/operations/syncPorts";
import updateService from "~/operations/updateService";
import { getData } from "~/utils/form";

export async function create(formData: FormData) {
  const data = NewServiceDTO.parse(getData(formData));
  await db.transaction(async tx => {
    const service = await createService(tx, data);
    if (data.kind === "database") {
      const envEntries: [string, string][] = [];
      const portEntries: [string, string][] = [];
      if (data.repo === "postgres") {
        envEntries.push(["POSTGRES_PASSWORD", "example"]);
        portEntries.push(["5432", "5432"]);
        const volume = await createVolume(tx, { containerPath: "/var/lib/postgresql/data", serviceId: service.id });
        await createDockerVolume(volume.id);
      }
      if (data.repo === "mysql") {
        envEntries.push(["MYSQL_ROOT_PASSWORD", "example"]);
        portEntries.push(["3306", "3306"]);
        const volume = await createVolume(tx, { containerPath: "/var/lib/mysql", serviceId: service.id });
        await createDockerVolume(volume.id);
      }
      if (data.repo === "mongo") {
        envEntries.push(["MONGO_INITDB_ROOT_USERNAME", "root"]);
        envEntries.push(["MONGO_INITDB_ROOT_PASSWORD", "example"]);
        portEntries.push(["27017", "27017"]);
        const volume = await createVolume(tx, { containerPath: "/data/db", serviceId: service.id });
        await createDockerVolume(volume.id);
      }
      if (data.repo === "redis") {
        envEntries.push(["REDIS_ARGS", "--appendonly yes"]);
        portEntries.push(["6379", "6379"]);
        const volume = await createVolume(tx, { containerPath: "/data", serviceId: service.id });
        await createDockerVolume(volume.id);
      }
      if (envEntries.length) {
        await syncEnvironmentVariables(tx, service.id, Object.fromEntries(envEntries));
      }
      if (portEntries.length) {
        await syncPorts(tx, service.id, Object.fromEntries(portEntries));
      }
      const network = await createNetwork(tx, service.id);
      await createDockerNetwork(network.id);
    }
  });
  redirect("/services");
}

export async function update(id: string, _: unknown, formData: FormData): Promise<Record<string, string>> {
  const env = JSON.parse(formData.get("env") as string) as Record<string, string>;
  const ports = JSON.parse(formData.get("ports") as string) as Record<string, string>;
  const patch = ServicePatchDTO.omit({ repo: true }).parse(getData(formData));
  const outdatedService = await getService(db, id);
  if (!outdatedService) throw new Error("Invalid Service");
  if (outdatedService.containerId) {
    await removeContainer(outdatedService.containerId);
    patch.containerId = null;
    patch.imageId = null;
  }
  if (outdatedService.status === "running") {
    patch.status = "idle";
  }
  await db.transaction(async tx => {
    await updateService(tx, id, patch);
    await syncEnvironmentVariables(tx, id, env);
    await syncPorts(tx, id, ports);
  });
  redirect("/services");
}

export async function destroy(id: string, _: FormData) {
  const service = await getService(db, id);
  if (service) {
    await Promise.all(service.networks.map(destroyNetwork));
  }
  await deleteService(db, id);
  redirect("/services");
}

export async function start(serviceId: string, _: FormData) {
  const service = await getService(db, serviceId);
  if (!service) throw new Error("Invalid Service");

  const getLatestBuild = async () => {
    const images = await getBuildImages(db, serviceId, ["id", "createdAt"]);
    const latest = images.reduce((bestVersion, nextVersion) => {
      const best = new Date(bestVersion.createdAt).getTime();
      const next = new Date(nextVersion.createdAt).getTime();
      return (next > best) ? nextVersion : bestVersion;
    }, images[0]);
    return latest.id;
  };

  const getServiceImage = async () => {
    switch (service.kind) {
      case "git": return await getLatestBuild();
      case "database": return service.repo;
    }
  };

  const image = await getServiceImage();
  const containerId = await createContainer(
    kebabCase(service.name),
    image,
    service.environmentVariables,
    service.ports,
    service.volumes,
    service.providers.map(provider => provider.networkIds).flat(),
  );
  await updateService(db, service.id, { status: "running", containerId, imageId: image });
  redirect(`/services/${serviceId}`);
}

export async function stop(id: string, containerId: string, _: FormData) {
  if (containerId) {
    try {
      await removeContainer(containerId);
    } catch (error) {
      // do nothing
    } finally {
      await updateService(db, id, { status: "idle", containerId: null, imageId: null });
    }
  }
  redirect(`/services/${id}`);
}

export async function build(id: string, _: FormData) {
  const service = await getService(db, id);
  if (service) {
    await startBuilding(service);
  }
  redirect(`/services/${id}`);
}

export async function attachDatabase(serviceId: string, databaseId: string, _: FormData) {
  await createServiceLink(db, serviceId, databaseId);
  redirect(`/services/${serviceId}/databases`);
}

export async function detachDatabase(serviceId: string, databaseId: string, _: FormData) {
  await deleteServiceLink(db, serviceId, databaseId);
  redirect(`/services/${serviceId}/databases`);
}
