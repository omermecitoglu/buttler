import { cancelBuild, removeContainer, removeImage } from "./docker.js";
import { omit } from "./object.js";
import { getAllServices, prepareService } from "./services.js";

async function handleWebhookEvent(event: WekHookEvent) {
  const savedServices = await getAllServices();
  for (const [serviceId, service] of Object.entries(savedServices)) {
    if (service.repo !== event.repository.ssh_url) continue;
    console.log(serviceId + " needs update");
    if (service.containerId) {
      await removeContainer(service.containerId);
    }
    if (service.imageId) {
      if (service.state === "building") {
        await cancelBuild(serviceId, service.imageId);
      } else {
        await removeImage(service.imageId);
      }
    }
    await prepareService(serviceId, {
      ...omit(service, "state", "containerId", "imageId"),
      state: "cloned",
    });
  }
}

export default app;
