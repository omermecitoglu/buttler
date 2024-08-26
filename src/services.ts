import fs from "node:fs/promises";
import path from "node:path";

type Service = {
  name: string,
  repo: string,
  env: Record<string, string>,
  ports: Record<string, string>,
  state: "idle" | "cloned" | "building" | "built" | "ready",
  imageId?: string,
  containerId?: string,
};

async function getRepoPath(serviceId: string) {
  const repoPath = path.resolve(process.cwd(), "storage/repos", serviceId);
  await fs.mkdir(repoPath, { recursive: true });
  return repoPath;
}

export async function deleteRepo(serviceId: string) {
  const repoPath = await getRepoPath(serviceId);
  await fs.rm(repoPath, { recursive: true, force: true });
}

/* export async function prepareService(id: string, data: Service) {
  console.log("service", `"${id}"`, "is", data.state);
  await saveService(id, data);
  switch (data.state) {
    case "idle": {
      const repoPath = await getRepoPath(id);
      console.log("service", `"${id}"`, "is", "cloning");
      await cloneRepo(data.repo, repoPath);
      await prepareService(id, { ...data, state: "cloned" });
      break;
    }
    case "cloned": {
      const imageId = crypto.randomUUID();
      await saveService(id, { ...data, state: "building", imageId });
      console.log("service", `"${id}"`, "is", "building");
      const repoPath = await getRepoPath(id);
      const success = await buildImage(imageId, repoPath);
      if (success) {
        await deleteRepo(id);
        await prepareService(id, { ...data, state: "built", imageId });
      }
      break;
    }
    case "building": {
      await prepareService(id, { ...data, state: "cloned" });
      break;
    }
    case "built": {
      if (!data.imageId) throw new Error("image ID of the service is not defined");
      const containerId = await createContainer(data);
      await prepareService(id, { ...data, state: "ready", containerId });
      break;
    }
    case "ready": {
      break;
    }
  }
} */

export async function getPredefinedServices() {
  const filePath = path.resolve(process.cwd(), "services.json");
  const content = await fs.readFile(filePath, "utf-8");
  return JSON.parse(content) as Omit<Service, "state" | "imageId" | "containerId">[];
}
