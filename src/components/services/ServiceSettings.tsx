import { connection } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";
import { deleteServiceAction } from "~/actions/service";
import DeleteServiceModal from "~/components/services/DeleteServiceModal";
import ServiceDomains from "~/components/services/ServiceDomains";
import Card from "~/components/ui/card";
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
      <ServiceDomains service={service} />
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
