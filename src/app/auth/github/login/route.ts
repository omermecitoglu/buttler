import { redirect } from "next/navigation";
import { createGitHubLogin, getAuthorizeUrl } from "~/core/github/login";
import { getPublicOrigin } from "~/core/headers";
import { getSession } from "~/core/session";
import { getSetting } from "~/core/settings";

/** Starts a login, the state belongs to this browser, so another site can't start it */
export async function GET(request: Request) {
  const [
    clientId,
    session,
    publicOrigin,
  ] = await Promise.all([
    getSetting("github_client_id"),
    getSession(),
    getPublicOrigin(request.headers),
  ]);

  // The login page explains that the GitHub App has to be set up first
  if (!clientId) return redirect("/login");

  const login = createGitHubLogin();
  session.githubLogin = login;
  await session.save();
  return redirect(getAuthorizeUrl(clientId, new URL("/auth/github", publicOrigin).toString(), login.state));
}
