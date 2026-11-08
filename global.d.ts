import type messages from "./dictionaries/en.json";
import type { formats } from "./src/i18n/request";
import type { routing } from "./src/i18n/routing";

declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number],
    Messages: typeof messages,
    Formats: typeof formats,
  }
}
