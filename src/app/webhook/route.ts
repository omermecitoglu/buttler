import crypto from "node:crypto";
import { kebabCase } from "change-case";
import { buildImage, createContainer, removeContainer } from "~/core/docker";
import { cloneRepo, deleteRepo } from "~/core/git";
import { verifySignature } from "~/core/github";
import db from "~/database";
import createBuildImage from "~/operations/createBuildImage";
import getServiceByRepo from "~/operations/getServiceByRepo";
import updateService from "~/operations/updateService";

type WekHookEvent = {
  repository: {
    ssh_url: string,
  },
};

export async function POST(request: Request) {
  const buffer = await request.arrayBuffer();
  const isSafe = verifySignature(request, buffer, "buttler");
  if (!isSafe) {
    return new Response("Unauthorized", { status: 401 });
  }
  const event = JSON.parse(Buffer.from(buffer).toString()) as WekHookEvent;

  const service = await getServiceByRepo(db, event.repository.ssh_url);
  if (service) {
    (async () => {
      const repoPath = await cloneRepo(service.repo, service.id);
      const imageId = crypto.randomUUID();
      const success = await buildImage(imageId, repoPath, false);
      await deleteRepo(service.id);
      if (success) {
        await createBuildImage(db, { id: imageId, serviceId: service.id });
        if (service.containerId) {
          await removeContainer(service.containerId);
        }
        const containerId = await createContainer(
          kebabCase(service.name),
          imageId,
          service.environmentVariables,
          service.ports
        );
        await updateService(db, service.id, { status: "ready", containerId });
      }
    })();
  }
  return new Response("Webhook received", { status: 200 });
}
