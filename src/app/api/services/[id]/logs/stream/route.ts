import { isContainerRunning, parseTimestamp, readContainerLogs } from "~/core/docker/logs";
import { findServiceContainer } from "~/core/docker/status";
import { getSession } from "~/core/session";
import { getSingleService } from "~/data/services";
import type { NextRequest } from "next/server";

const DEFAULT_TAIL = 500;
const MAX_TAIL = 2000;
/** Reverse proxies close the connections that are silent for a while (60 seconds for nginx) */
const KEEP_ALIVE_INTERVAL = 20_000;

function parseTail(value: string | null) {
  const tail = parseInt(value ?? "", 10);
  return isNaN(tail) ? DEFAULT_TAIL : Math.min(Math.max(tail, 1), MAX_TAIL);
}

function parseSince(value: string | null) {
  return value && parseTimestamp(value) !== null ? value : null;
}

export async function GET(request: NextRequest, { params }: RouteContext<"/api/services/[id]/logs/stream">) {
  // The proxy doesn't cover the API routes
  const session = await getSession();
  if (!session.userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const service = await getSingleService(id);
  const container = service ? await findServiceContainer(service) : null;
  if (!container) return Response.json({ error: "Container not found" }, { status: 404 });

  const searchParams = request.nextUrl.searchParams;
  const cancellation = new AbortController();
  const signal = AbortSignal.any([request.signal, cancellation.signal]);
  const batches = readContainerLogs(container, {
    tail: parseTail(searchParams.get("tail")),
    // The header is sent by browsers while reconnecting
    since: parseSince(request.headers.get("last-event-id") ?? searchParams.get("since")),
    signal,
  });

  const encoder = new TextEncoder();
  let keepAlive: NodeJS.Timeout | undefined;

  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      // Sends the headers even if there are no logs yet
      controller.enqueue(encoder.encode(": connected\n\n"));
      keepAlive = setInterval(() => {
        controller.enqueue(encoder.encode(": keep-alive\n\n"));
      }, KEEP_ALIVE_INTERVAL);
    },
    async pull(controller) {
      let finalEvent: string;
      try {
        const { done, value: lines } = await batches.next();
        if (cancellation.signal.aborted) return;
        if (!done) {
          const lastTimestamp = lines.at(-1)?.timestamp;
          const idField = lastTimestamp ? `id: ${lastTimestamp}\n` : "";
          controller.enqueue(encoder.encode(`${idField}data: ${JSON.stringify(lines)}\n\n`));
          return;
        }
        const running = !signal.aborted && await isContainerRunning(container);
        finalEvent = `event: end\ndata: ${JSON.stringify({ running })}\n\n`;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Failed to read container logs:", error);
        finalEvent = "event: failure\ndata: {}\n\n";
      }
      clearInterval(keepAlive);
      if (cancellation.signal.aborted) return;
      controller.enqueue(encoder.encode(finalEvent));
      controller.close();
    },
    cancel() {
      clearInterval(keepAlive);
      cancellation.abort();
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
