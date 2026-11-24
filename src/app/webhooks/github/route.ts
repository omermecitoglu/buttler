import { startBuilding } from "~/core/build";
import { PushEvent, getPushedBranch, verifyWebhookSignature } from "~/core/github/webhooks";
import { getSetting } from "~/core/settings";
import db from "~/database";
import getDeployableService from "~/operations/getDeployableService";
import getServicesByBranch from "~/operations/getServicesByBranch";

/* eslint-disable no-console */

function parseJson(body: Buffer): unknown {
  try {
    return JSON.parse(body.toString());
  } catch {
    return null;
  }
}

async function startBuildingById(serviceId: string) {
  try {
    const service = await getDeployableService(db, serviceId);
    if (!service) return false;
    startBuilding(service);
    return true;
  } catch (error) {
    console.error(`Failed to start building service ${serviceId}:`, error);
    return false;
  }
}

export async function POST(request: Request) {
  // Untrusted until the signature is verified
  const delivery = JSON.stringify(request.headers.get("x-github-delivery"));
  const respond = (status: number, message: string) => {
    const log = status < 400 ? console.info : console.warn;
    log(`GitHub webhook ${delivery}: ${message}`);
    return Response.json({ message }, { status });
  };

  const secret = await getSetting("github_webhook_secret");
  if (!secret) return respond(503, "The webhook secret is not configured");

  const body = Buffer.from(await request.arrayBuffer());
  if (!verifyWebhookSignature(body, request.headers.get("x-hub-signature-256"), secret)) {
    return respond(401, "Invalid signature");
  }

  const eventName = request.headers.get("x-github-event");
  if (!eventName) return respond(400, "Missing event name");
  if (eventName === "ping") return respond(200, "pong");
  if (eventName !== "push") return respond(200, `Ignored the ${eventName} event`);

  const { success, data: event } = PushEvent.safeParse(parseJson(body));
  if (!success) return respond(400, "Malformed push event");

  const branch = getPushedBranch(event.ref);
  const source = `${event.repository.full_name} (${event.ref})`;
  if (!branch || event.deleted) return respond(200, `Ignored the push to ${source}`);

  const services = await getServicesByBranch(db, event.repository.full_name, branch);
  if (!services.length) return respond(200, `No service is deployed from ${source}`);

  const results = await Promise.all(services.map(service => startBuildingById(service.id)));
  const started = services.filter((_, index) => results[index]).map(service => service.id);
  if (!started.length) return respond(500, `Failed to start any build for ${source}`);

  const commit = event.head_commit?.id ?? "unknown commit";
  return respond(202, `Building ${started.join(", ")} for ${commit} of ${source}`);
}
