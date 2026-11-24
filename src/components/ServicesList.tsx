import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import EmptyServicesState from "~/components/EmptyServicesState";
import ServiceCard from "~/components/ServiceCard";
import ServicesPoller from "~/components/ServicesPoller";
import { getServicesWithLiveStatus } from "~/data/services";

const ServicesList = async () => {
  await connection();
  const [
    services,
    t,
  ] = await Promise.all([
    getServicesWithLiveStatus(),
    getTranslations("DashboardPage"),
  ]);

  const cardLabels = {
    source: t("service.source"),
    ports: t("service.ports"),
    ipAddress: t("service.ipAddress"),
    uptime: t("service.uptime"),
    deployedBuild: t("service.deployedBuild"),
    builtAt: t("service.builtAt"),
    none: t("service.none"),
    notAvailable: t("service.notAvailable"),
    status: {
      running: t("service.status.running"),
      stopped: t("service.status.stopped"),
      exited: t("service.status.exited"),
      building: t("service.status.building"),
      pulling: t("service.status.pulling"),
      restarting: t("service.status.restarting"),
    },
    types: {
      github: t("service.types.github"),
      dockerhub: t("service.types.dockerhub"),
      system: t("service.types.system"),
    },
  };

  if (services.length === 0) {
    return (
      <div className="mt-8">
        <EmptyServicesState
          title={t("emptyState.title")}
          description={t("emptyState.description")}
          actionLabel={t("emptyState.action")}
        />
      </div>
    );
  }

  const isAnyServiceBusy = services.some(s => s.runtime.status === "pulling" ||
    s.runtime.status === "building" ||
    s.runtime.status === "restarting");

  return (
    <>
      {isAnyServiceBusy && <ServicesPoller />}
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {services.map(service => (
          <ServiceCard
            key={service.id}
            service={service}
            labels={cardLabels}
          />
        ))}
      </div>
    </>
  );
};

export default ServicesList;
