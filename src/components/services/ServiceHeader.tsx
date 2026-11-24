import { connection } from "next/server";
import { getLocale, getTranslations } from "next-intl/server";
import { deleteServiceAction, updateServiceAction } from "~/actions/service";
import ServiceActions from "~/components/ServiceActions";
import ServiceTypeBadge from "~/components/ServiceTypeBadge";
import ServicesPoller from "~/components/ServicesPoller";
import StatusBadge from "~/components/StatusBadge";
import DeleteServiceModal from "~/components/services/DeleteServiceModal";
import EditServiceModal from "~/components/services/EditServiceModal";
import { getCurrentUser } from "~/core/auth";
import { getServiceWithLiveStatus, getVolumesOfService } from "~/data/services";
import { notFound } from "~/i18n/navigation";

export type ServiceHeaderProps = {
  params: Promise<{ id: string }>,
};

const ServiceHeader = async ({ params }: ServiceHeaderProps) => {
  await connection();
  const { id } = await params;
  const [
    service,
    user,
    locale,
    t,
  ] = await Promise.all([
    getServiceWithLiveStatus(id),
    getCurrentUser(),
    getLocale(),
    getTranslations("DashboardPage.service"),
  ]);
  if (!service) notFound();

  const { status } = service.runtime;
  const isDeletable = user?.role === "admin" && service.type !== "system";
  const isBusy = status === "pulling" || status === "building" || status === "restarting";

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {isBusy && <ServicesPoller />}
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="truncate text-2xl font-bold tracking-tight text-slate-100">{service.name}</h1>
          {service.type !== "system" && (
            <EditServiceModal
              action={updateServiceAction.bind(null, service.id)}
              edit={{ section: "name", name: service.name }}
              iconOnly
            />
          )}
        </div>
        <div className="flex items-center gap-2">
          <ServiceTypeBadge type={service.type} label={t(`types.${service.type}`)} />
          <StatusBadge status={status} label={t(`status.${status}`)} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <ServiceActions serviceId={service.id} type={service.type} status={status} />
        {isDeletable && (
          <DeleteServiceModal
            action={deleteServiceAction.bind(null, service.id, locale)}
            name={service.name}
            volumes={await getVolumesOfService(service)}
            disabled={status === "pulling" || status === "building"}
          />
        )}
      </div>
    </div>
  );
};

export default ServiceHeader;
