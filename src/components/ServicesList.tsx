import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import EmptyServicesState from "~/components/EmptyServicesState";
import ServiceCard from "~/components/ServiceCard";
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
    none: t("service.none"),
    notAvailable: t("service.notAvailable"),
    actions: {
      start: t("service.actions.start"),
      stop: t("service.actions.stop"),
      restart: t("service.actions.restart"),
      logs: t("service.actions.logs"),
      details: t("service.actions.details"),
      starting: t("service.actions.starting"),
      stopping: t("service.actions.stopping"),
      restarting: t("service.actions.restarting"),
    },
    status: {
      running: t("service.status.running"),
      stopped: t("service.status.stopped"),
      exited: t("service.status.exited"),
      building: t("service.status.building"),
      restarting: t("service.status.restarting"),
    },
    types: {
      github: t("service.types.github"),
      dockerhub: t("service.types.dockerhub"),
      system: t("service.types.system"),
    },
  };

  const logsLabels = {
    title: t("logsModal.title"),
    close: t("logsModal.close"),
    copy: t("logsModal.copy"),
    copied: t("logsModal.copied"),
    loading: t("logsModal.loading"),
    empty: t("logsModal.empty"),
    error: t("logsModal.error"),
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

  return (
    <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {services.map(service => (
        <ServiceCard
          key={service.id}
          service={service}
          labels={cardLabels}
          logsLabels={logsLabels}
        />
      ))}
    </div>
  );
};

export default ServicesList;
