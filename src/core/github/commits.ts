import { githubFetch } from "./client";

export type GitHubCommit = {
  hash: string,
  shortHash: string,
  /** The first line of the commit message */
  message: string,
  author: string | null,
  /** ISO 8601 date string */
  date: string | null,
  url: string,
};

export type CommitRange = {
  /** Oldest first, GitHub returns at most 250 of them */
  commits: GitHubCommit[],
  /** The number of commits in the range, it can be larger than the commits that are listed */
  total: number,
};

type GitHubCommitApiResponse = {
  sha: string,
  html_url: string,
  commit: {
    message: string,
    author: { name: string, date: string } | null,
  },
};

function formatCommit(raw: GitHubCommitApiResponse): GitHubCommit {
  return {
    hash: raw.sha,
    shortHash: raw.sha.slice(0, 7),
    message: raw.commit.message.split("\n")[0],
    author: raw.commit.author?.name ?? null,
    date: raw.commit.author?.date ?? null,
    url: raw.html_url,
  };
}

/** Returns the commits that are reachable from the head but not from the base */
export async function compareCommits(
  token: string | null,
  owner: string,
  repo: string,
  base: string,
  head: string,
): Promise<CommitRange> {
  const { data } = await githubFetch<{
    total_commits: number,
    commits: GitHubCommitApiResponse[],
  }>(`/repos/${owner}/${repo}/compare/${base}...${head}`, token);
  return { commits: data.commits.map(formatCommit), total: data.total_commits };
}

export async function getCommit(token: string | null, owner: string, repo: string, hash: string): Promise<GitHubCommit> {
  const { data } = await githubFetch<GitHubCommitApiResponse>(`/repos/${owner}/${repo}/commits/${hash}`, token);
  return formatCommit(data);
}
