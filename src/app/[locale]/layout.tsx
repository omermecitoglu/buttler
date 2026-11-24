import { pick } from "@omer/object";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { routing } from "~/i18n/routing";
import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "Buttler",
  description: "makes your life easier",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
  },
};

export function generateStaticParams() {
  return routing.locales.map(locale => ({ locale }));
}

export default async function({ children }: LayoutProps<"/[locale]">) {
  const [
    locale,
    messages,
  ] = await Promise.all([
    getLocale(),
    getMessages(),
  ]);

  return (
    <html lang={locale} className="scheme-dark">
      <body data-theme="dark" className="min-h-screen bg-slate-950 text-slate-100">
        <NextIntlClientProvider
          messages={pick(
            messages,
            "BaseLayout",
            "DashboardPage",
            "InstallPage",
            "NewServicePage",
          )}
        >
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
