import { verifySignature } from "~/core/github";

type WekHookEvent = {
  repository: {
    ssh_url: string,
  },
};

export async function POST(request: Request) {
  const buffer = await request.arrayBuffer();
  const isSafe = verifySignature(request, buffer, "buttler");
  if (isSafe) {
    const data = JSON.parse(Buffer.from(buffer).toString()) as WekHookEvent;
    data; // TODO: use this to update services
    return new Response("Webhook received", { status: 200 });
  }
  return new Response("Unauthorized", { status: 401 });
}
