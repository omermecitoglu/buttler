import { connection } from "next/server";
import { getFormatter, getTranslations } from "next-intl/server";
import { updateServiceAction } from "~/actions/service";
import EditServiceModal from "~/components/services/EditServiceModal";
import ServiceInfoList from "~/components/services/ServiceInfoList";
import ServiceInfoSection from "~/components/services/ServiceInfoSection";
import { getServiceWithLiveStatus } from "~/data/services";
import { notFound } from "~/i18n/navigation";

export type ServiceInfoProps = {
  params: Promise<{ id: string }>,
};

const ServiceInfo = async ({ params }: ServiceInfoProps) => {
  await connection();
  const { id } = await params;
  const [
    service,
    t,
    tService,
    tScopes,
    format,
  ] = await Promise.all([
    getServiceWithLiveStatus(id),
    getTranslations("ServicePage.info"),
    getTranslations("DashboardPage.service"),
    getTranslations("NewServicePage.envSection.scopes"),
    getFormatter(),
  ]);
  if (!service) notFound();

  const { runtime, deployedImage } = service;
  const notAvailable = t("notAvailable");
  const isGitHub = service.type === "github";

  const runtimeItems = [
    { label: t("container"), value: runtime.containerName ?? notAvailable },
    {
      label: t("containerId"),
      value: runtime.containerId?.slice(0, 12) ?? notAvailable,
      title: runtime.containerId ?? undefined,
    },
    { label: t("uptime"), value: runtime.uptime ?? notAvailable },
    { label: t("ipAddress"), value: runtime.ipAddresses.join(", ") || notAvailable },
  ];

  const sourceItems = [
    { label: t("type"), value: tService(`types.${service.type}`) },
    { label: isGitHub ? t("repository") : t("image"), value: service.repository ?? notAvailable },
    { label: isGitHub ? t("branch") : t("tag"), value: service.branch ?? notAvailable },
    ...isGitHub ? [
      {
        label: t("deployedBuild"),
        value: deployedImage?.commit?.slice(0, 7) ?? notAvailable,
        title: deployedImage?.commit ?? undefined,
      },
      {
        label: t("builtAt"),
        value: deployedImage
          ? format.dateTime(new Date(deployedImage.builtAt), { dateStyle: "medium", timeStyle: "short" })
          : notAvailable,
      },
    ] : [],
  ];

  return (
    <div className="flex flex-col gap-4">
      {service.type !== "system" && (
        <div className="flex justify-end">
          <EditServiceModal
            action={updateServiceAction.bind(null, service.id)}
            service={{
              name: service.name,
              type: service.type,
              repository: service.repository ?? "",
              branch: service.branch ?? "",
              ports: service.ports,
              environmentVariables: service.environmentVariables,
              volumes: service.volumes,
            }}
          />
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ServiceInfoSection title={t("runtime")}>
          <ServiceInfoList items={runtimeItems} />
        </ServiceInfoSection>
        <ServiceInfoSection title={t("source")}>
          <ServiceInfoList items={sourceItems} />
        </ServiceInfoSection>
        <ServiceInfoSection title={t("ports")}>
          {service.ports.length === 0 ? (
            <p className="text-sm text-slate-500">{t("noPorts")}</p>
          ) : (
            <ul className="flex flex-col gap-2 font-mono text-sm text-slate-300">
              {service.ports.map(port => (
                <li key={port.external}>{`${port.external} → ${port.internal}`}</li>
              ))}
            </ul>
          )}
        </ServiceInfoSection>
        <ServiceInfoSection title={t("volumes")}>
          {service.volumes.length === 0 ? (
            <p className="text-sm text-slate-500">{t("noVolumes")}</p>
          ) : (
            <ul className="flex flex-col gap-2 font-mono text-sm break-all text-slate-300">
              {service.volumes.map(volume => (
                <li key={volume.id}>{`${volume.name} → ${volume.containerPath}`}</li>
              ))}
            </ul>
          )}
        </ServiceInfoSection>
      </div>
      <ServiceInfoSection title={t("variables")}>
        {service.environmentVariables.length === 0 ? (
          <p className="text-sm text-slate-500">{t("noVariables")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-slate-500">
                <tr>
                  <th className="pr-4 pb-2 font-medium">{t("key")}</th>
                  <th className="pr-4 pb-2 font-medium">{t("value")}</th>
                  {isGitHub && <th className="pb-2 font-medium">{t("scope")}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {service.environmentVariables.map(variable => (
                  <tr key={variable.key}>
                    <td className="py-2 pr-4 font-mono text-slate-200">{variable.key}</td>
                    <td className="py-2 pr-4 font-mono break-all text-slate-400">
                      {variable.isSecret ? (
                        <span className="rounded border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-xs text-amber-400">
                          {t("secret")}
                        </span>
                      ) : variable.value}
                    </td>
                    {isGitHub && <td className="py-2 text-slate-400">{tScopes(variable.scope)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ServiceInfoSection>
    </div>
  );
};

export default ServiceInfo;
