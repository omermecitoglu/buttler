import { defineRouting } from "next-intl/routing";

export type AppLocale = typeof routing.locales[number];

export const routing = defineRouting({
  locales: ["en"],
  defaultLocale: "en",
  localePrefix: {
    mode: "as-needed",
  },
  localeDetection: false,
  pathnames: {
    "/": "/",
    "/services": "/services",
    "/services/new": "/services/new",
    "/services/[id]": "/services/[id]",
    "/services/[id]/builds": "/services/[id]/builds",
    "/services/[id]/logs": "/services/[id]/logs",
    "/services/[id]/links": "/services/[id]/links",
    "/services/[id]/settings": "/services/[id]/settings",
    "/settings": "/settings",
    "/login": "/login",
    "/install": "/install",
  },
});
