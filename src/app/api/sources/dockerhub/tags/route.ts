import { requireUser } from "~/core/auth";
import { getDockerHubTags } from "~/core/dockerhub";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  await requireUser();
  const image = request.nextUrl.searchParams.get("image");
  if (!image) {
    return Response.json({ tags: [] });
  }

  try {
    const tags = await getDockerHubTags(image.trim(), { pageSize: 50 });
    return Response.json({ tags });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch Docker Hub tags.";
    return Response.json({ error: message, tags: [] }, { status: 500 });
  }
}
