import { getInstallationTokenForOwner } from "~/core/github/app";
import { getRepositoryBranches } from "~/core/github/repos";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const repoFullName = request.nextUrl.searchParams.get("repo");
  if (!repoFullName) {
    return Response.json({ error: "Query parameter 'repo' is required.", branches: [] }, { status: 400 });
  }

  const [owner, repo] = repoFullName.trim().split("/");
  if (!owner || !repo) {
    return Response.json({ error: "Invalid repository format. Expected 'owner/repo'.", branches: [] }, { status: 400 });
  }

  try {
    const token = await getInstallationTokenForOwner(owner);

    if (!token) {
      return Response.json({ error: "GitHub token unavailable.", branches: [] }, { status: 400 });
    }

    const branches = await getRepositoryBranches(token, owner, repo);
    const branchNames = branches.map(b => b.name);
    return Response.json({ branches: branchNames });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch branches.";
    return Response.json({ error: message, branches: [] }, { status: 500 });
  }
}
