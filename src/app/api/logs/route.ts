import { getContainerLogs } from "~/core/docker";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const containerId = searchParams.get("container");
  if (!containerId) throw new Error("container id is not provided");
  const logs = await getContainerLogs(containerId, 100);
  return Response.json(logs);
}
