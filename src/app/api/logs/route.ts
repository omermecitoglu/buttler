import { getContainerLogs } from "~/core/docker";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const containerId = searchParams.get("container");
  if (!containerId) throw new Error("container id is not provided");
  const limit = parseInt(searchParams.get("limit") ?? "100");
  const logs = await getContainerLogs(containerId, isNaN(limit) ? 100 : limit);
  return Response.json({ content: logs });
}
