import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import CurrentUser from "~/components/layout/CurrentUser";
import CurrentUserSkeleton from "~/components/layout/CurrentUserSkeleton";
import MobileHeader from "~/components/layout/MobileHeader";
import Sidebar from "~/components/layout/Sidebar";
import ToastProvider from "~/components/ui/toast";
import { getCurrentUser } from "~/core/auth";

export default async function({ children }: LayoutProps<"/[locale]">) {
  const t = await getTranslations("BaseLayout");

  // Not awaited, so that the rest of the layout can be prerendered
  const isAdmin = getCurrentUser().then(user => user?.role === "admin");

  const currentUser = (
    <Suspense fallback={<CurrentUserSkeleton />}>
      <CurrentUser />
    </Suspense>
  );

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-slate-100 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-slate-950"
      >
        {t("skipToContent")}
      </a>
      <Sidebar currentUser={currentUser} isAdmin={isAdmin} />
      <MobileHeader currentUser={currentUser} isAdmin={isAdmin} />
      <main id="content" className="min-w-0 flex-1 scroll-mt-14 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        <div className="mx-auto w-full max-w-7xl">
          <ToastProvider>{children}</ToastProvider>
        </div>
      </main>
    </div>
  );
}
