import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { createServiceAction } from "~/actions/service";
import Authorized from "~/components/auth/Authorized";
import NewServiceForm from "~/components/services/NewServiceForm";
import ServicePanelSkeleton from "~/components/services/ServicePanelSkeleton";

export default async function(_page: PageProps<"/[locale]/services/new">) {
  const [
    locale,
    t,
  ] = await Promise.all([
    getLocale(),
    getTranslations("NewServicePage"),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="pb-6 border-b border-slate-800/80">
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">{t("title")}</h1>
        <p className="mt-1 text-sm text-slate-400">{t("subtitle")}</p>
      </div>
      <Suspense fallback={<ServicePanelSkeleton />}>
        <Authorized>
          <NewServiceForm action={createServiceAction.bind(null, locale)} />
        </Authorized>
      </Suspense>
    </div>
  );
}
