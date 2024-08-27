import fs from "node:fs/promises";
import path from "node:path";
import { kebabCase } from "change-case";
import { buildImage, createContainer } from "~/core/docker";
import appEnv from "~/core/env";
import { cloneRepo, deleteRepo } from "~/core/git";
import db from "~/database";
import getServices from "~/operations/getServices";
import updateService from "~/operations/updateService";

type WorkBody = {
  secret: string,
  recover: boolean,
};

function keepWorking(url: string, body: WorkBody) {
  return fetch(url, {
    method: "POST",
    body: JSON.stringify({
      ...body,
      recover: false,
    }),
  });
}

export async function POST(request: Request) {
  const body = await request.json() as WorkBody;
  if (body.secret !== process.env.WEBHOOK_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  const allServices = await getServices(db, ["id", "name", "repo", "status", "imageId", "environmentVariables", "ports"]);
  const service = allServices.find(s => s.status !== "ready");

  if (service) {
    const repoPath = path.resolve(appEnv.CURRENT_WORKING_DIRECTORY, "storage/repos", service.id);
    const env = Object.fromEntries(service.environmentVariables.map(({ key, value }) => [key, value]));
    const ports = Object.fromEntries(service.ports.map(({ external, internal }) => [external, internal.toString()]));
    switch (service.status) {
      case "idle": {
        await fs.mkdir(repoPath, { recursive: true });
        await cloneRepo(service.repo, repoPath);
        await updateService(db, service.id, { status: "cloned" });
        break;
      }
      case "cloned": {
        const imageId = crypto.randomUUID();
        await updateService(db, service.id, { status: "building", imageId });
        (async () => {
          const success = await buildImage(imageId, repoPath, false);
          if (success) {
            await deleteRepo(service.id);
            await updateService(db, service.id, { status: "built", imageId });
            keepWorking(request.url, body);
          }
        })();
        break;
      }
      case "building": {
        if (body.recover) {
          await updateService(db, service.id, { status: "cloned" });
        }
        break;
      }
      case "built": {
        if (!service.imageId) throw new Error("image ID of the service is not defined");
        const containerId = await createContainer(kebabCase(service.name), service.imageId, env, ports);
        await updateService(db, service.id, { status: "ready", containerId });
        break;
      }
    }

    if (service.status !== "building" || body.recover) {
      keepWorking(request.url, body);
    }
  }
  return Response.json({});
}
