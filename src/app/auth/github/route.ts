import { redirect } from "next/navigation";
import { getAccess } from "~/core/access";
import { isSameSecret } from "~/core/compare";
import { type GitHubLogin, exchangeLoginCode } from "~/core/github/login";
import { getPublicOrigin } from "~/core/headers";
import { getHomePath } from "~/core/home";
import { getSession } from "~/core/session";
import { getSetting } from "~/core/settings";
import { isSetupSession } from "~/core/setup";
import { deleteSetupCode } from "~/core/setup-code";
import db from "~/database";
import type { NewUserDTO } from "~/models/user";
import claimAdmin from "~/operations/claimAdmin";
import hasAdmin from "~/operations/hasAdmin";
import updateUser from "~/operations/updateUser";

/** Only the browser that the setup link was opened in can become the admin */
async function completeSetup(account: NewUserDTO) {
  if (!await isSetupSession()) return false;
  await claimAdmin(db, account);
  deleteSetupCode();
  return true;
}

/** An expired or invalid code, or an unreachable GitHub, is only written to the server log */
async function exchangeCode(code: string, redirectUri: string): Promise<GitHubLogin | null> {
  const [
    clientId,
    clientSecret,
  ] = await Promise.all([
    getSetting("github_client_id"),
    getSetting("github_client_secret"),
  ]);
  try {
    if (!clientId || !clientSecret) throw new Error("The GitHub App is not set up");
    return await exchangeLoginCode(clientId, clientSecret, code, redirectUri);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to log in with GitHub:", error);
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams, pathname } = new URL(request.url);
  const [
    session,
    publicOrigin,
  ] = await Promise.all([
    getSession(),
    getPublicOrigin(request.headers),
  ]);

  const state = searchParams.get("state");
  const pending = session.githubLogin;
  // A login that another site started has no state in this browser
  if (!state || !pending || !isSameSecret(state, pending.state)) return redirect("/login?error=invalid_state");

  // It can only be used once
  delete session.githubLogin;
  await session.save();

  if (pending.expiresAt < Date.now()) return redirect("/login?error=invalid_state");
  const error = searchParams.get("error");
  if (error !== null) return redirect(`/login?error=${error === "access_denied" ? "access_denied" : "github"}`);
  const code = searchParams.get("code");
  if (!code) return redirect("/login?error=missing_code");

  // Nothing is written to the session before the code is exchanged
  const login = await exchangeCode(code, new URL(pathname, publicOrigin).toString());
  if (!login) return redirect("/login?error=github");
  const { token, user } = login;

  const account = { id: user.id, login: user.login, avatar: user.avatar };
  if (await completeSetup(account)) delete session.setupCode;
  if (!await getAccess(user.id)) {
    session.destroy();
    return redirect(await hasAdmin(db) ? "/login?error=not_allowed" : "/login?error=setup_link");
  }
  await updateUser(db, account);
  session.userId = user.id;
  session.user = {
    login: user.login,
    name: user.name,
    avatar: user.avatar,
  };
  session.githubToken = token;
  await session.save();
  return redirect(getHomePath(publicOrigin));
}
