import { getAllAppInstallationTokens } from "~/core/github/app";
import { getInstallationRepositories, getUserInstallationRepositories } from "~/core/github/repos";
import { getSession } from "~/core/session";

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

    if (installationTokens.length > 0) {
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
    }

    const session = await getSession();
    if (session.githubToken) {
      try {
        const repos = await getUserInstallationRepositories(session.githubToken);
        const mappedRepos: SourceRepository[] = repos.map(repo => ({
          id: repo.id,
          name: repo.name,
          fullName: repo.fullName,
          defaultBranch: repo.defaultBranch,
          private: repo.private,
          owner: repo.owner.login,
        }));
        mappedRepos.sort((a, b) => a.fullName.localeCompare(b.fullName));
        return Response.json({ repositories: mappedRepos });
      } catch (err) {
        const message = err instanceof Error && err.message.includes("credentials")
          ? "GitHub session has expired or token is invalid. Please log out and log in again with GitHub."
          : err instanceof Error ? err.message : "Failed to fetch repositories.";
        return Response.json({ error: message, repositories: [] }, { status: 401 });
      }
    }

    return Response.json({ error: "GitHub App is not connected.", repositories: [] }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch repositories.";
    return Response.json({ error: message, repositories: [] }, { status: 500 });
  }
}
