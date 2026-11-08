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

  const encodeBase64Url = (obj: object) =>
    Buffer.from(JSON.stringify(obj)).toString("base64url");

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

export async function getInstallationAccessToken(
  options: GetInstallationAccessTokenOptions,
): Promise<InstallationAccessToken> {
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
