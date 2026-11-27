import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import Authorized from "~/components/auth/Authorized";
import ServicePanelSkeleton from "~/components/services/ServicePanelSkeleton";
import CloudflareSettings from "~/components/settings/CloudflareSettings";
import DashboardDomain from "~/components/settings/DashboardDomain";
import SystemServices from "~/components/settings/SystemServices";
import UserWhitelist from "~/components/settings/UserWhitelist";

export default async function({ searchParams }: PageProps<"/[locale]/settings">) {
  const t = await getTranslations("SettingsPage");

  return (
    <div className="flex flex-col gap-6">
      <div className="border-b border-slate-800/80 pb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">{t("title")}</h1>
        <p className="mt-1 text-sm text-slate-400">{t("subtitle")}</p>
      </div>
      <Suspense fallback={<ServicePanelSkeleton />}>
        <Authorized adminOnly>
          <div className="flex flex-col gap-6">
            <Suspense fallback={<ServicePanelSkeleton />}>
              <CloudflareSettings searchParams={searchParams} />
            </Suspense>
            <Suspense fallback={<ServicePanelSkeleton />}>
              <DashboardDomain />
            </Suspense>
            <Suspense fallback={<ServicePanelSkeleton />}>
              <SystemServices />
            </Suspense>
            <UserWhitelist />
          </div>
        </Authorized>
      </Suspense>
    </div>
  );
}
