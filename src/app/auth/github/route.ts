import { redirect } from "next/navigation";
import { getConfigs } from "~/core/config";
import { getUser } from "~/core/github/users";
import { getPublicOrigin } from "~/core/headers";
import { getHomePath } from "~/core/home";
import { getSession } from "~/core/session";

export async function GET(request: Request) {
  const { searchParams, pathname } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return Response.json({ error: "Missing code" }, { status: 400 });
  }

  const [
    configs,
    session,
    publicOrigin,
  ] = await Promise.all([
    getConfigs(),
    getSession(),
    getPublicOrigin(request.headers),
  ]);

  if (!configs.githubAppClientId) {
    throw new Error("Client ID of the GitHub App is missing in the configurations!");
  }
  if (!configs.githubAppClientSecret) {
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
        client_id: configs.githubAppClientId,
        client_secret: configs.githubAppClientSecret,
        code,
        redirect_uri: originURL,
      }),
    });

    const data = await tokenRes.json();
    const user = await getUser(data.access_token);
    session.userId = user.id;
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
