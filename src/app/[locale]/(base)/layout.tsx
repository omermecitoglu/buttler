import { faServer } from "@fortawesome/free-solid-svg-icons/faServer";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { getLocale, getTranslations } from "next-intl/server";
import LogoutButton from "~/components/LogoutButton";
import { Link } from "~/i18n/navigation";
import type { AppLocale } from "~/i18n/routing";

export default async function({ children }: LayoutProps<"/[locale]">) {
  const [
    locale,
    t,
  ] = await Promise.all([
    getLocale() as Promise<AppLocale>,
    getTranslations("BaseLayout"),
  ]);

  return (
    <div className="flex h-screen">
      {/* Sidebar placeholder */}
      <aside className="flex w-60 shrink-0 flex-col">
        {/* Logo / branding */}
        <div className="flex h-16 shrink-0 items-center px-4">
          <span className="text-lg font-semibold tracking-tight text-slate-100">Buttler</span>
        </div>
        {/* Nav links placeholder */}
        <nav className="flex flex-1 flex-col gap-1 px-2 py-2">
          <Link
            href="/services"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <FontAwesomeIcon icon={faServer} className="size-4 text-slate-400" />
            <span>{t("nav.services")}</span>
          </Link>
        </nav>
        {/* Avatar / user section placeholder */}
        <div className="flex h-16 shrink-0 items-center gap-3 px-4">
          <LogoutButton locale={locale} label={t("logout")} />
        </div>
      </aside>
      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top header placeholder */}
        <header className="flex h-16 shrink-0 items-center justify-between px-6">
          {/* page title / breadcrumb placeholder */}
          <div />
          {/* header actions placeholder */}
          <div />
        </header>
        {/* Page content */}
        <main className="flex-1 overflow-y-auto px-6 py-4">
          {children}
        </main>
      </div>
    </div>
  );
}
