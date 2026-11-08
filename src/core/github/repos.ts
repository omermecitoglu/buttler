import { githubFetch } from "./client";

export type RepositorySort = "created" | "updated" | "pushed" | "full_name";
export type SortDirection = "asc" | "desc";
export type RepositoryVisibility = "all" | "public" | "private";
export type RepositoryType = "all" | "owner" | "public" | "private" | "member";

export type GetRepositoriesOptions = {
  visibility?: RepositoryVisibility,
  affiliation?: string,
  type?: RepositoryType,
  sort?: RepositorySort,
  direction?: SortDirection,
  perPage?: number,
  per_page?: number,
  page?: number,
  search?: string,
};

export type GitHubRepository = {
  id: number,
  name: string,
  fullName: string,
  full_name: string,
  owner: {
    id: number,
    login: string,
    avatarUrl: string,
    avatar_url: string,
    htmlUrl: string,
    html_url: string,
    type: string,
  },
  private: boolean,
  htmlUrl: string,
  html_url: string,
  description: string | null,
  fork: boolean,
  url: string,
  cloneUrl: string,
  clone_url: string,
  sshUrl: string,
  ssh_url: string,
  defaultBranch: string,
  default_branch: string,
  createdAt: string,
  created_at: string,
  updatedAt: string,
  updated_at: string,
  pushedAt: string,
  pushed_at: string,
  language: string | null,
  archived: boolean,
  disabled: boolean,
  visibility?: string,
  openIssuesCount: number,
  open_issues_count: number,
  stargazersCount: number,
  stargazers_count: number,
  forksCount: number,
  forks_count: number,
  permissions?: {
    admin?: boolean,
    maintain?: boolean,
    push?: boolean,
    triage?: boolean,
    pull?: boolean,
  },
};

type GitHubRepositoryApiResponse = {
  id: number,
  name: string,
  full_name: string,
  owner: {
    id: number,
    login: string,
    avatar_url: string,
    html_url: string,
    type: string,
  },
  private: boolean,
  html_url: string,
  description: string | null,
  fork: boolean,
  url: string,
  clone_url: string,
  ssh_url: string,
  default_branch: string,
  created_at: string,
  updated_at: string,
  pushed_at: string,
  language: string | null,
  archived: boolean,
  disabled: boolean,
  visibility?: string,
  open_issues_count: number,
  stargazers_count: number,
  forks_count: number,
  permissions?: {
    admin?: boolean,
    maintain?: boolean,
    push?: boolean,
    triage?: boolean,
    pull?: boolean,
  },
};

function formatRepository(raw: GitHubRepositoryApiResponse): GitHubRepository {
  return {
    id: raw.id,
    name: raw.name,
    fullName: raw.full_name,
    full_name: raw.full_name,
    owner: {
      id: raw.owner.id,
      login: raw.owner.login,
      avatarUrl: raw.owner.avatar_url,
      avatar_url: raw.owner.avatar_url,
      htmlUrl: raw.owner.html_url,
      html_url: raw.owner.html_url,
      type: raw.owner.type,
    },
    private: raw.private,
    htmlUrl: raw.html_url,
    html_url: raw.html_url,
    description: raw.description ?? null,
    fork: raw.fork,
    url: raw.url,
    cloneUrl: raw.clone_url,
    clone_url: raw.clone_url,
    sshUrl: raw.ssh_url,
    ssh_url: raw.ssh_url,
    defaultBranch: raw.default_branch,
    default_branch: raw.default_branch,
    createdAt: raw.created_at,
    created_at: raw.created_at,
    updatedAt: raw.updated_at,
    updated_at: raw.updated_at,
    pushedAt: raw.pushed_at,
    pushed_at: raw.pushed_at,
    language: raw.language ?? null,
    archived: raw.archived,
    disabled: raw.disabled,
    visibility: raw.visibility,
    openIssuesCount: raw.open_issues_count,
    open_issues_count: raw.open_issues_count,
    stargazersCount: raw.stargazers_count,
    stargazers_count: raw.stargazers_count,
    forksCount: raw.forks_count,
    forks_count: raw.forks_count,
    permissions: raw.permissions,
  };
}

export async function getRepositories(
  accessToken: string,
  options: GetRepositoriesOptions = {},
): Promise<GitHubRepository[]> {
  const search = options.search?.trim();
  const perPage = options.perPage ?? options.per_page ?? 30;
  const page = options.page ?? 1;

  if (search) {
    const allFetched: GitHubRepositoryApiResponse[] = [];
    const maxPages = 5;
    let currentPage = 1;

    while (currentPage <= maxPages) {
      const searchParams = new URLSearchParams();
      if (options.visibility) searchParams.set("visibility", options.visibility);
      if (options.affiliation) searchParams.set("affiliation", options.affiliation);
      if (options.type) searchParams.set("type", options.type);
      if (options.sort) searchParams.set("sort", options.sort);
      if (options.direction) searchParams.set("direction", options.direction);
      searchParams.set("per_page", "100");
      searchParams.set("page", String(currentPage));

      const { data } = await githubFetch<GitHubRepositoryApiResponse[]>(
        `/user/repos?${searchParams.toString()}`,
        accessToken,
      );

      allFetched.push(...data);

      if (data.length < 100) {
        break;
      }
      currentPage++;
    }

    const lowerSearch = search.toLowerCase();
    const matched = allFetched.filter(repo => {
      const nameMatch = repo.name.toLowerCase().includes(lowerSearch);
      const fullNameMatch = repo.full_name.toLowerCase().includes(lowerSearch);
      const descMatch = repo.description?.toLowerCase().includes(lowerSearch);
      return nameMatch || fullNameMatch || descMatch;
    });

    const startIndex = (page - 1) * perPage;
    const paginated = matched.slice(startIndex, startIndex + perPage);
    return paginated.map(formatRepository);
  }

  const searchParams = new URLSearchParams();
  if (options.visibility) searchParams.set("visibility", options.visibility);
  if (options.affiliation) searchParams.set("affiliation", options.affiliation);
  if (options.type) searchParams.set("type", options.type);
  if (options.sort) searchParams.set("sort", options.sort);
  if (options.direction) searchParams.set("direction", options.direction);
  searchParams.set("per_page", String(perPage));
  searchParams.set("page", String(page));

  const { data } = await githubFetch<GitHubRepositoryApiResponse[]>(
    `/user/repos?${searchParams.toString()}`,
    accessToken,
  );

  return data.map(formatRepository);
}

export const getUserRepositories = getRepositories;
export const getRepos = getRepositories;
