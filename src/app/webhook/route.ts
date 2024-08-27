import { cancelBuild, removeContainer, removeImage } from "~/core/docker";
import { verifySignature } from "~/core/github";
import { startWorking } from "~/core/work";
import db from "~/database";
import getServices from "~/operations/getServices";
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

  const services = await getServices(db, ["id", "repo", "status", "imageId", "containerId"]);
  for (const service of services) {
    if (service.repo !== event.repository.ssh_url) continue;
    if (service.containerId) {
      await removeContainer(service.containerId);
    }
    if (service.imageId) {
      if (service.status === "building") {
        await cancelBuild(service.id, service.imageId);
      } else {
        await removeImage(service.imageId);
      }
    }

    await updateService(db, service.id, {
      status: "cloned",
      imageId: null,
      containerId: null,
    });
  }
  startWorking(false);
  return new Response("Webhook received", { status: 200 });
}
