import { faRightFromBracket } from "@fortawesome/free-solid-svg-icons/faRightFromBracket";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { getLocale, getTranslations } from "next-intl/server";
import { logout } from "~/actions/session";
import Button from "~/components/ui/button";
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
          <span className="text-lg font-semibold tracking-tight">Buttler</span>
        </div>
        {/* Nav links placeholder */}
        <nav className="flex flex-1 flex-col gap-1 px-2 py-2">
          {/* nav items will go here */}
        </nav>
        {/* Avatar / user section placeholder */}
        <div className="flex h-16 shrink-0 items-center gap-3 px-4">
          <form action={logout.bind(null, locale)} className="w-full">
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2.5 text-slate-400 hover:bg-slate-900 hover:text-rose-400"
            >
              <FontAwesomeIcon icon={faRightFromBracket} className="size-4" />
              <span>{t("logout")}</span>
            </Button>
          </form>
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
