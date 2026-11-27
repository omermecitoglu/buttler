import { requireUser } from "~/core/auth";
import { getServicePullProgress, isServicePulling } from "~/core/docker/status";

/** Docker sends many events per second, the browser only needs a few of them */
const UPDATE_INTERVAL = 500;

export async function GET(request: Request, { params }: RouteContext<"/api/services/[id]/pull/stream">) {
  // The proxy doesn't cover the API routes
  await requireUser();

  const { id } = await params;
  const encoder = new TextEncoder();
  let interval: NodeJS.Timeout | undefined;
  let lastData: string | null = null;

  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const stop = () => {
        clearInterval(interval);
        request.signal.removeEventListener("abort", stop);
      };
      const send = () => {
        if (!isServicePulling(id)) {
          stop();
          controller.enqueue(encoder.encode("event: end\ndata: {}\n\n"));
          controller.close();
          return;
        }
        const data = JSON.stringify(getServicePullProgress(id));
        // An unchanged progress is still sent as a comment, which keeps the connection alive
        controller.enqueue(encoder.encode(data === lastData ? ": waiting\n\n" : `data: ${data}\n\n`));
        lastData = data;
      };
      request.signal.addEventListener("abort", stop);
      send();
      interval = setInterval(send, UPDATE_INTERVAL);
    },
    cancel() {
      clearInterval(interval);
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      // Prevents nginx from buffering the stream
      "X-Accel-Buffering": "no",
    },
  });
}
