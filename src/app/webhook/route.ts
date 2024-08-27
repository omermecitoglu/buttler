import crypto from "node:crypto";
import { buildImage } from "~/core/docker";
import { cloneRepo, deleteRepo } from "~/core/git";
import { verifySignature } from "~/core/github";
import db from "~/database";
import createBuildImage from "~/operations/createBuildImage";
import getServiceByRepo from "~/operations/getServiceByRepo";

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
      if (success) {
        await createBuildImage(db, { id: imageId, serviceId: service.id });
      }
      await deleteRepo(service.id);
    })();
  }
  return new Response("Webhook received", { status: 200 });
}
