import { getAllAppInstallationTokens } from "~/core/github/app";
import { getInstallationRepositories } from "~/core/github/repos";

export type SourceRepository = {
  id: number,
  name: string,
  fullName: string,
  defaultBranch: string,
  private: boolean,
  owner: string,
};

export async function GET() {
  try {
    const installationTokens = await getAllAppInstallationTokens();

    if (installationTokens.length === 0) {
      return Response.json({ error: "GitHub App is not connected.", repositories: [] }, { status: 400 });
    }

    const allRepos: SourceRepository[] = [];

    for (const inst of installationTokens) {
      try {
        const res = await getInstallationRepositories(inst.token);
        for (const repo of res.repositories) {
          allRepos.push({
            id: repo.id,
            name: repo.name,
            fullName: repo.fullName,
            defaultBranch: repo.defaultBranch,
            private: repo.private,
            owner: repo.owner.login,
          });
        }
      } catch {
        // If an installation fails, continue with others
      }
    }

    allRepos.sort((a, b) => a.fullName.localeCompare(b.fullName));

    return Response.json({ repositories: allRepos });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch repositories.";
    return Response.json({ error: message, repositories: [] }, { status: 500 });
  }
}
