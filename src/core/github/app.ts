import crypto from "node:crypto";
import { githubFetch } from "./client";

export type InstallationAccessToken = {
  token: string,
  expiresAt: string,
  expires_at: string,
  permissions: Record<string, string>,
  repositorySelection?: "all" | "selected",
  repository_selection?: "all" | "selected",
};

export type GetInstallationAccessTokenOptions = {
  appId: string | number,
  privateKey: string,
  installationId: string | number,
  repositories?: string[],
  repositoryIds?: number[],
  permissions?: Record<string, string>,
};

export function generateAppJwt(appId: string | number, privateKey: string): string {
  const header = {
    alg: "RS256",
    typ: "JWT",
  };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iat: now - 60,
    exp: now + 600,
    iss: appId.toString(),
  };

  const encodeBase64Url = (obj: object) => Buffer.from(JSON.stringify(obj)).toString("base64url");

  const unsignedToken = `${encodeBase64Url(header)}.${encodeBase64Url(payload)}`;
  const signature = crypto
    .sign("sha256", Buffer.from(unsignedToken), privateKey)
    .toString("base64url");

  return `${unsignedToken}.${signature}`;
}

type RawInstallationAccessTokenResponse = {
  token: string,
  expires_at: string,
  permissions: Record<string, string>,
  repository_selection?: "all" | "selected",
};

export async function getInstallationAccessToken(options: GetInstallationAccessTokenOptions): Promise<InstallationAccessToken> {
  const { appId, privateKey, installationId, repositories, repositoryIds, permissions } = options;
  const jwt = generateAppJwt(appId, privateKey);

  const bodyPayload: Record<string, unknown> = {};
  if (repositories?.length) {
    bodyPayload.repositories = repositories;
  }
  if (repositoryIds?.length) {
    bodyPayload.repository_ids = repositoryIds;
  }
  if (permissions && Object.keys(permissions).length > 0) {
    bodyPayload.permissions = permissions;
  }

  const hasBody = Object.keys(bodyPayload).length > 0;
  const response = await githubFetch<RawInstallationAccessTokenResponse>(
    `/app/installations/${installationId}/access_tokens`,
    jwt,
    {
      method: "POST",
      body: hasBody ? JSON.stringify(bodyPayload) : undefined,
      headers: hasBody ? { "content-type": "application/json" } : undefined,
    },
  );

  const raw = response.data;
  return {
    token: raw.token,
    expiresAt: raw.expires_at,
    expires_at: raw.expires_at,
    permissions: raw.permissions,
    repositorySelection: raw.repository_selection,
    repository_selection: raw.repository_selection,
  };
}

export function getAuthenticatedCloneUrl(repoUrl: string, token: string): string {
  return repoUrl.replace(/^https:\/\/(?:[^@]+@)?/, `https://x-access-token:${token}@`);
}

export type GitHubAppInstallation = {
  id: number,
  account: {
    login: string,
    id: number,
    avatarUrl?: string,
    type: string,
  },
  appId: number,
  targetType: string,
  repositorySelection: "all" | "selected",
};

export async function getAppInstallations(jwt: string): Promise<GitHubAppInstallation[]> {
  const response = await githubFetch<{
    id: number,
    account: {
      login: string,
      id: number,
      avatar_url?: string,
      type: string,
    },
    app_id: number,
    target_type: string,
    repository_selection: "all" | "selected",
  }[]>("/app/installations", jwt);

  return response.data.map(item => ({
    id: item.id,
    account: {
      login: item.account.login,
      id: item.account.id,
      avatarUrl: item.account.avatar_url,
      type: item.account.type,
    },
    appId: item.app_id,
    targetType: item.target_type,
    repositorySelection: item.repository_selection,
  }));
}

export async function getAppInstallationToken(installationId?: string | number): Promise<string | null> {
  const { getSetting, setSetting } = await import("~/core/settings");
  const appId = await getSetting("github_app_id");
  const privateKey = await getSetting("github_private_key");
  if (!appId || !privateKey) {
    return null;
  }

  let targetId = installationId ? String(installationId) : await getSetting("github_installation_id");
  if (!targetId) {
    const jwt = generateAppJwt(appId, privateKey);
    const installations = await getAppInstallations(jwt);
    if (!installations.length) {
      return null;
    }
    targetId = String(installations[0].id);
    await setSetting("github_installation_id", targetId);
  }

  const { token } = await getInstallationAccessToken({
    appId,
    privateKey,
    installationId: targetId,
  });

  return token;
}

export type AppInstallationTokenInfo = {
  installationId: number,
  accountLogin: string,
  accountType: string,
  token: string,
};

export async function getAllAppInstallationTokens(): Promise<AppInstallationTokenInfo[]> {
  const { getSetting } = await import("~/core/settings");
  const appId = await getSetting("github_app_id");
  const privateKey = await getSetting("github_private_key");
  if (!appId || !privateKey) {
    return [];
  }

  try {
    const jwt = generateAppJwt(appId, privateKey);
    const installations = await getAppInstallations(jwt);

    const results: AppInstallationTokenInfo[] = [];
    for (const inst of installations) {
      try {
        const { token } = await getInstallationAccessToken({
          appId,
          privateKey,
          installationId: inst.id,
        });
        results.push({
          installationId: inst.id,
          accountLogin: inst.account.login,
          accountType: inst.account.type,
          token,
        });
      } catch {
        // Continue if an individual installation fails
      }
    }

    return results;
  } catch {
    return [];
  }
}

export async function getInstallationTokenForOwner(owner: string): Promise<string | null> {
  const tokens = await getAllAppInstallationTokens();
  const matched = tokens.find(t => t.accountLogin.toLowerCase() === owner.toLowerCase());
  if (matched) {
    return matched.token;
  }
  return tokens[0]?.token ?? null;
}

export type GitHubAppMetadata = {
  id: number,
  slug: string,
  htmlUrl: string,
  installationUrl: string,
};

export async function getGitHubAppMetadata(): Promise<GitHubAppMetadata | null> {
  const { getSetting, setSetting } = await import("~/core/settings");
  const appId = await getSetting("github_app_id");
  const privateKey = await getSetting("github_private_key");
  if (!appId || !privateKey) {
    return null;
  }

  const cachedSlug = await getSetting("github_app_slug");
  if (cachedSlug) {
    const htmlUrl = `https://github.com/apps/${cachedSlug}`;
    return {
      id: Number(appId),
      slug: cachedSlug,
      htmlUrl,
      installationUrl: `${htmlUrl}/installations/new`,
    };
  }

  try {
    const jwt = generateAppJwt(appId, privateKey);
    const response = await githubFetch<{
      id: number,
      slug: string,
      html_url: string,
    }>("/app", jwt);

    const { id, slug, html_url: htmlUrl } = response.data;
    if (slug) {
      await setSetting("github_app_slug", slug);
    }
    const finalHtmlUrl = htmlUrl || `https://github.com/apps/${slug}`;
    return {
      id,
      slug,
      htmlUrl: finalHtmlUrl,
      installationUrl: `${finalHtmlUrl}/installations/new`,
    };
  } catch {
    return null;
  }
}
