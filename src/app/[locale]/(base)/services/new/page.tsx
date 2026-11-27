import { connection } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { createServiceAction } from "~/actions/service";
import Authorized from "~/components/auth/Authorized";
import NewServiceForm from "~/components/services/NewServiceForm";
import ServicePanelSkeleton from "~/components/services/ServicePanelSkeleton";
import { getVolumeOptions } from "~/data/services";
import type { AppLocale } from "~/i18n/routing";

/** The volumes are read from Docker, only for the users with access */
async function NewServiceFormWithVolumes({ locale }: { locale: AppLocale }) {
  await connection();
  const volumeOptions = await getVolumeOptions();
  return <NewServiceForm action={createServiceAction.bind(null, locale)} volumeOptions={volumeOptions} />;
}

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
          <NewServiceFormWithVolumes locale={locale} />
        </Authorized>
      </Suspense>
    </div>
  );
}
