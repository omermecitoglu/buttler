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
    "/services/[serviceId]": "/services/[serviceId]",
    "/login": "/login",
    "/install": "/install",
  },
});
