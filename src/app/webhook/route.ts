import { kebabCase } from "change-case";
import { buildImage, createContainer, removeContainer } from "~/core/docker";
import { cloneRepo, deleteRepo } from "~/core/git";
import { verifySignature } from "~/core/github";
import db from "~/database";
import createBuildImage from "~/operations/createBuildImage";
import getServiceByRepo from "~/operations/getServiceByRepo";
import updateBuildImage from "~/operations/updateBuildImage";
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
      const image = await createBuildImage(db, { serviceId: service.id });
      const success = await buildImage(image.id, repoPath, false);
      await deleteRepo(service.id);
      await updateBuildImage(db, image.id, { status: success ? "ready" : "failed" });

      // update container
      if (service.containerId) {
        await removeContainer(service.containerId);
        const containerId = await createContainer(
          kebabCase(service.name),
          image.id,
          service.environmentVariables,
          service.ports
        );
        await updateService(db, service.id, { status: "ready", containerId });
      }
    })();
  }
  return new Response("Webhook received", { status: 200 });
}
