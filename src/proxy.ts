import { type NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { getPublicOrigin } from "./core/headers";
import { getHomePath } from "./core/home";
import { getSession } from "./core/session";
import { routing } from "./i18n/routing";

const handleI18nRouting = createMiddleware(routing);

const publicPages = [
  "/privacy-policy",
  "/terms-of-service",
];

function startsWith(target: string, name: string[] | string): boolean {
  if (Array.isArray(name)) {
    return name.map(n => startsWith(target, n)).includes(true);
  }
  return new RegExp(`^/([a-z]{2}/)?${name.slice(1)}`).test(target);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const [
    session,
    publicOrigin,
  ] = await Promise.all([
    getSession(),
    getPublicOrigin(request.headers),
  ]);

  if (startsWith(pathname, publicPages)) {
    // public pages
  } else if (startsWith(pathname, ["/login"])) {
    if (session.userId) {
      return NextResponse.redirect(new URL(getHomePath(publicOrigin), request.url));
    }
  } else if (!session.userId) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return handleI18nRouting(request);
}

export const config = {
  matcher: [
    "/((?!api|webhook|auth|_next|_vercel|.*\\..*).*)",
  ],
};
