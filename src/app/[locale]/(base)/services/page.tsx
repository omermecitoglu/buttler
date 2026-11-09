import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import ServicesHeader from "~/components/ServicesHeader";
import ServicesList from "~/components/ServicesList";
import ServicesSkeleton from "~/components/ServicesSkeleton";

export default async function(_page: PageProps<"/[locale]/services">) {
  const t = await getTranslations("DashboardPage");

  return (
    <div className="flex flex-col">
      <ServicesHeader
        title={t("title")}
        subtitle={t("subtitle")}
        addServiceLabel={t("addService")}
        refreshLabel={t("refresh")}
        refreshingLabel={t("refreshing")}
      />
      <Suspense fallback={<ServicesSkeleton />}>
        <ServicesList />
      </Suspense>
    </div>
  );
}
