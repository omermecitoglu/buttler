import { githubFetch } from "./client";

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
