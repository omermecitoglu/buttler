import { handleProxy, setLocalizedPathname } from "@omer-x/next-utils/proxy";
import { type NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { getAccess } from "./core/access";
import { getPublicOrigin } from "./core/headers";
import { getHomePath } from "./core/home";
import { getSession } from "./core/session";
import { isInstalled } from "./core/settings";
import { routing } from "./i18n/routing";

const handleI18nRouting = createMiddleware(routing);

/** Keeps the locale of the request, but not its query */
function redirectTo(request: NextRequest, pathname: string) {
  const url = setLocalizedPathname(routing.locales, request.url, pathname);
  url.search = "";
  return NextResponse.redirect(url);
}

export async function proxy(request: NextRequest) {
  const [
    session,
    publicOrigin,
    installed,
  ] = await Promise.all([
    getSession(),
    getPublicOrigin(request.headers),
    isInstalled(),
  ]);

  // Only the setup is open until the installation is done
  if (!installed) {
    return handleProxy(routing.locales, request, {
      publicPages: ["/install"],
      isLoggedIn: () => false,
      redirectToHomePage: () => redirectTo(request, "/install"),
      redirectToLoginPage: () => redirectTo(request, "/install"),
      defaultProcedure: () => handleI18nRouting(request),
    });
  }

  const access = await getAccess(session.userId);
  const homePath = getHomePath(publicOrigin);
  return handleProxy(routing.locales, request, {
    // The setup is done, so it leads home whether the user is logged in or not
    publicPages: ["/install"],
    authPages: ["/login"],
    isLoggedIn: () => access !== null,
    redirectToHomePage: () => redirectTo(request, homePath),
    redirectToLoginPage: () => redirectTo(request, "/login"),
    defaultProcedure: pathname => (pathname === "/install" ? redirectTo(request, homePath) : handleI18nRouting(request)),
  });
}

export const config = {
  matcher: [
    "/((?!api|webhooks|auth|_next|_vercel|.*\\..*).*)",
  ],
};
