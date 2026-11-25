"use server";
import { createPrivateKey } from "node:crypto";
import { redirect } from "next/navigation";
import { requireSetup } from "~/core/auth";
import { type GitHubAppInfo, getGitHubApp } from "~/core/github/app";
import { GitHubAuthError } from "~/core/github/errors";
import { setSetting } from "~/core/settings";
import { getSetupProgress } from "~/core/setup-progress";

export type InstallError = "invalidAppId" | "missingPrivateKey" | "invalidPrivateKey" | "missingClientSecret" |
  "invalidCredentials" | "appIdMismatch" | "githubUnreachable" | "domainUnreachable";

export type InstallState = {
  error?: InstallError,
};

async function readPrivateKey(formData: FormData): Promise<string> {
  const file = formData.get("privateKeyFile");
  if (file instanceof File && file.size > 0) {
    return (await file.text()).trim();
  }
  return formData.get("privateKey")?.toString().trim() ?? "";
}

function isValidPrivateKey(pem: string): boolean {
  try {
    createPrivateKey(pem);
    return true;
  } catch {
    return false;
  }
}

export async function installApp(_prevState: InstallState, formData: FormData): Promise<InstallState> {
  await requireSetup();
  const appId = formData.get("appId")?.toString().trim() ?? "";
  const privateKey = await readPrivateKey(formData);
  const clientSecret = formData.get("clientSecret")?.toString().trim() ?? "";
  const webhookSecret = formData.get("webhookSecret")?.toString().trim() ?? "";

  if (!(/^\d+$/).test(appId)) {
    return { error: "invalidAppId" };
  }
  if (!privateKey) {
    return { error: "missingPrivateKey" };
  }
  if (!isValidPrivateKey(privateKey)) {
    return { error: "invalidPrivateKey" };
  }
  if (!clientSecret) {
    return { error: "missingClientSecret" };
  }

  // The app needs the domain, which may have changed since the form was opened
  const progress = await getSetupProgress();
  if (progress.step !== "github") {
    return { error: "domainUnreachable" };
  }

  let app: GitHubAppInfo;
  try {
    app = await getGitHubApp(appId, privateKey);
  } catch (error) {
    return { error: error instanceof GitHubAuthError ? "invalidCredentials" : "githubUnreachable" };
  }

  if (String(app.id) !== appId) {
    return { error: "appIdMismatch" };
  }

  await Promise.all([
    setSetting("github_app_id", appId),
    setSetting("github_private_key", privateKey),
    setSetting("github_client_id", app.clientId),
    setSetting("github_client_secret", clientSecret),
    setSetting("github_app_slug", app.slug),
    setSetting("github_app_domain", progress.hostname),
    ...(webhookSecret ? [setSetting("github_webhook_secret", webhookSecret)] : []),
  ]);
  await setSetting("installed", "true");

  redirect("/login");
}
