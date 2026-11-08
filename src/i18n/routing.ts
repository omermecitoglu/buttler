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
    "/login": "/login",
    "/install": "/install",
  },
});
