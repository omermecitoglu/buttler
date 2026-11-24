import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import ContainerLogs from "~/components/services/ContainerLogs";
import Card from "~/components/ui/card";
import { getServiceWithLiveStatus } from "~/data/services";
import { notFound } from "~/i18n/navigation";

export type ServiceLogsProps = {
  params: Promise<{ id: string }>,
};

const ServiceLogs = async ({ params }: ServiceLogsProps) => {
  await connection();
  const { id } = await params;
  const [
    service,
    t,
  ] = await Promise.all([
    getServiceWithLiveStatus(id),
    getTranslations("ServicePage.logs"),
  ]);
  if (!service) notFound();

  const { containerId } = service.runtime;
  if (!containerId) return <Card className="p-6 text-sm text-slate-500">{t("noContainer")}</Card>;

  return <ContainerLogs key={containerId} containerId={containerId} />;
};

export default ServiceLogs;
