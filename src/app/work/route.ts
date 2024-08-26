import fs from "node:fs/promises";
import path from "node:path";
import { kebabCase } from "change-case";
import db from "~/database";
import { buildImage, createContainer } from "~/docker";
import { cloneRepo } from "~/git";
import getServices from "~/operations/getServices";
import updateService from "~/operations/updateService";
import { deleteRepo } from "~/services";

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

  const allServices = await getServices(db, ["id", "name", "repo", "status", "imageId"]);
  const service = allServices.find(s => s.status !== "ready");

  if (service) {
    const repoPath = path.resolve(process.cwd(), "storage/repos", service.id);
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
          const success = await buildImage(imageId, repoPath);
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
        const containerId = await createContainer(kebabCase(service.name), service.imageId, {}, {});
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