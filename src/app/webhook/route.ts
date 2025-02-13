import { headers } from "next/headers";
import { startBuilding } from "~/core/build";
import { verifySignature } from "~/core/github";
import db from "~/database";
import getServiceByRepo from "~/operations/getServiceByRepo";

type WekHookEvent = {
  ref: string,
  repository: {
    full_name: string,
  },
};

export async function POST(request: Request) {
  const buffer = await request.arrayBuffer();
  const isSafe = verifySignature(request, buffer, "buttler");
  if (!isSafe && process.env.NODE_ENV === "production") {
    return new Response("Unauthorized", { status: 401 });
  }
  const headersList = await headers();
  const eventName = headersList.get("X-GitHub-Event");
  switch (eventName) {
    case "ping": {
      // pong
      break;
    }
    case "push": {
      const event = JSON.parse(Buffer.from(buffer).toString()) as WekHookEvent;
      if (event.ref !== "refs/heads/main") break;
      const service = await getServiceByRepo(db, event.repository.full_name);
      if (service) {
        await startBuilding(service);
      }
      break;
    }
  }
  return new Response("Webhook received", { status: 200 });
}
