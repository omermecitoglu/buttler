import { githubFetch } from "./client";
import { isGitHubApiError, isGitHubAuthError } from "./errors";

export type GitHubUser = {
  id: number,
  login: string,
  name: string | null,
  avatar: string,
  avatar_url: string,
  email: string | null,
};

type GitHubUserApiResponse = {
  id: number,
  login: string,
  name: string | null,
  avatar_url: string,
  email: string | null,
};

type GitHubEmailApiResponse = {
  email: string,
  primary: boolean,
  verified: boolean,
  visibility?: string | null,
};

export async function getUser(accessToken: string): Promise<GitHubUser> {
  const { data } = await githubFetch<GitHubUserApiResponse>("/user", accessToken);

  let email = data.email ?? null;

  if (!email) {
    try {
      const { data: emails } = await githubFetch<GitHubEmailApiResponse[]>("/user/emails", accessToken);
      const primary =
        emails.find(e => e.primary && e.verified) ??
        emails.find(e => e.verified) ??
        emails.find(e => Boolean(e.email));
      if (primary?.email) {
        email = primary.email;
      }
    } catch {
      // Gracefully ignore if /user/emails is inaccessible (e.g. missing scope)
    }
  }

  return {
    id: data.id,
    login: data.login,
    name: data.name ?? null,
    avatar: data.avatar_url,
    avatar_url: data.avatar_url,
    email,
  };
}

export type GitHubAccount = Pick<GitHubUser, "id" | "login" | "avatar">;

/** Returns the account of a person by their handle, or null if it doesn't exist */
export async function findUser(login: string, accessToken: string | null = null): Promise<GitHubAccount | null> {
  if (!(/^[a-z\d][a-z\d_-]*$/i).test(login)) return null;
  try {
    const { data } = await githubFetch<GitHubUserApiResponse & { type: string }>(`/users/${login}`, accessToken);
    // Organizations and bots can't log in
    if (data.type !== "User") return null;
    return { id: data.id, login: data.login, avatar: data.avatar_url };
  } catch (error) {
    if (isGitHubApiError(error) && error.status === 404) return null;
    // The token of the session may have expired, accounts are public
    if (accessToken && isGitHubAuthError(error)) return await findUser(login);
    throw error;
  }
}
