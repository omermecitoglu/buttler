import { connection } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { deleteServiceAction, updateDevicesAction, updateInternetAccessAction } from "~/actions/service";
import DeleteServiceModal from "~/components/services/DeleteServiceModal";
import DevicesForm from "~/components/services/DevicesForm";
import InternetAccessForm from "~/components/services/InternetAccessForm";
import ServiceDomains from "~/components/services/ServiceDomains";
import ServicePanelSkeleton from "~/components/services/ServicePanelSkeleton";
import Card from "~/components/ui/card";
import { HOST_DEV_PATH } from "~/core/devices";
import { getServiceWithLiveStatus, getVolumesOfService } from "~/data/services";
import { notFound } from "~/i18n/navigation";

export type ServiceSettingsProps = {
  params: Promise<{ id: string }>,
};

const ServiceSettings = async ({ params }: ServiceSettingsProps) => {
  await connection();
  const { id } = await params;
  const [
    service,
    locale,
    t,
  ] = await Promise.all([
    getServiceWithLiveStatus(id),
    getLocale(),
    getTranslations("ServicePage.settings"),
  ]);
  if (!service) notFound();

  if (service.type === "system") {
    return <Card className="p-6 text-sm text-slate-500">{t("systemService")}</Card>;
  }

  const { status } = service.runtime;

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-6 p-6">
        <div>
          <h2 className="text-base font-semibold text-slate-100">{t("internetAccess.title")}</h2>
          <p className="mt-1 text-xs text-slate-400">{t("internetAccess.description")}</p>
        </div>
        <InternetAccessForm
          action={updateInternetAccessAction.bind(null, service.id)}
          hasInternetAccess={service.internetAccess}
          hasContainer={service.runtime.containerId !== null}
          isBusy={status === "pulling" || status === "building"}
        />
      </Card>
      <Card className="flex flex-col gap-6 p-6">
        <div>
          <h2 className="text-base font-semibold text-slate-100">{t("devices.title")}</h2>
          <p className="mt-1 text-xs text-slate-400">{t("devices.description", { path: HOST_DEV_PATH })}</p>
        </div>
        <DevicesForm
          action={updateDevicesAction.bind(null, service.id)}
          devices={service.devices.map(device => device.kind)}
          hasContainer={service.runtime.containerId !== null}
          isBusy={status === "pulling" || status === "building"}
        />
      </Card>
      <Suspense fallback={<ServicePanelSkeleton />}>
        <ServiceDomains service={service} />
      </Suspense>
      <Card className="flex flex-col gap-4 border-rose-500/20 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-100">{t("delete.title")}</h2>
          <p className="mt-1 text-xs text-slate-400">{t("delete.description")}</p>
        </div>
        <div className="shrink-0">
          <DeleteServiceModal
            action={deleteServiceAction.bind(null, service.id, locale)}
            name={service.name}
            volumes={await getVolumesOfService(service)}
            disabled={status === "pulling" || status === "building"}
          />
        </div>
      </Card>
    </div>
  );
};

export default ServiceSettings;
