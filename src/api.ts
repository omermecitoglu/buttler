import bodyParser from "body-parser";
import express from "express";
import { cancelBuild, removeContainer, removeImage } from "./docker.js";
import { verifySignature } from "./github.js";
import { omit } from "./object.js";
import { getAllServices, prepareService } from "./services.js";

const app = express();

app.use(bodyParser.json());

type WekHookEvent = {
  repository: {
    ssh_url: string,
  },
};

app.post("/webhook", bodyParser.json({ verify: verifySignature }), (req, res) => {
  handleWebhookEvent(req.body);
  res.status(200).send("Webhook received");
});

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
