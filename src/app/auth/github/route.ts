import { redirect } from "next/navigation";
import { getAccess } from "~/core/access";
import { getUser } from "~/core/github/users";
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

export async function GET(request: Request) {
  const { searchParams, pathname } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return Response.json({ error: "Missing code" }, { status: 400 });
  }

  const [
    clientId,
    clientSecret,
    session,
    publicOrigin,
  ] = await Promise.all([
    getSetting("github_client_id"),
    getSetting("github_client_secret"),
    getSession(),
    getPublicOrigin(request.headers),
  ]);

  if (!clientId) {
    throw new Error("Client ID of the GitHub App is missing in the configurations!");
  }
  if (!clientSecret) {
    throw new Error("Client secret of the GitHub App is missing in the configurations!");
  }

  const originURL = new URL(pathname, publicOrigin).toString();

  try {
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: originURL,
      }),
    });

    const data = await tokenRes.json();
    const user = await getUser(data.access_token);
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
    session.githubToken = data.access_token;
    await session.save();
    return redirect(getHomePath(publicOrigin));
  } catch (error) {
    if (typeof error === "object" && error && "message" in error && error.message === "NEXT_REDIRECT") {
      throw error;
    }
    return redirect("/login?error=github");
  }
}
