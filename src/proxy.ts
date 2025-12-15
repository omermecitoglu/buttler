import { type NextRequest, NextResponse } from "next/server";
import { getPublicOrigin } from "./core/headers";
import { getHomePath } from "./core/home";
import { getSession } from "./core/session";

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
  const response = NextResponse.next();
  // response.cookies.set('vercel', 'fast')
  return response;
}

export const config = {
  matcher: [
    "/((?!api|webhook|auth|_next|_vercel|.*\\..*).*)",
  ],
};
