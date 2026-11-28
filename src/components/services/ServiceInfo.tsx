import { connection } from "next/server";
import { getFormatter, getTranslations } from "next-intl/server";
import { updateServiceAction } from "~/actions/service";
import type { ServiceEdit } from "~/components/services/EditServiceFields";
import EditServiceModal from "~/components/services/EditServiceModal";
import ServiceInfoList from "~/components/services/ServiceInfoList";
import ServiceInfoSection from "~/components/services/ServiceInfoSection";
import {
  getAllServices,
  getExposedPortsOfService,
  getInheritedVariablesOfService,
  getServiceWithLiveStatus,
  getVolumeOptions,
} from "~/data/services";
import { notFound } from "~/i18n/navigation";
import { getContainerState } from "~/utils/containerState";

export type ServiceInfoProps = {
  params: Promise<{ id: string }>,
};

const ServiceInfo = async ({ params }: ServiceInfoProps) => {
  await connection();
  const { id } = await params;
  const [
    service,
    inheritedVariables,
    services,
    t,
    tService,
    tScopes,
    format,
    volumeOptions,
  ] = await Promise.all([
    getServiceWithLiveStatus(id),
    getInheritedVariablesOfService(id),
    getAllServices(),
    getTranslations("ServicePage.info"),
    getTranslations("DashboardPage.service"),
    getTranslations("NewServicePage.envSection.scopes"),
    getFormatter(),
    getVolumeOptions(id),
  ]);
  if (!service) notFound();

  const exposedPorts = await getExposedPortsOfService(service);
  const { runtime, deployedImage } = service;
  const containerState = getContainerState(runtime.status);
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

  const renderEdit = (edit: ServiceEdit) => service.type !== "system" && (
    <EditServiceModal action={updateServiceAction.bind(null, service.id)} edit={edit} />
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ServiceInfoSection title={t("runtime")}>
          <ServiceInfoList items={runtimeItems} />
        </ServiceInfoSection>
        <ServiceInfoSection
          title={t("source")}
          action={renderEdit({
            section: "source",
            isGitHub,
            repository: service.repository ?? "",
            branch: service.branch ?? "",
          })}
        >
          <ServiceInfoList items={sourceItems} />
        </ServiceInfoSection>
        <ServiceInfoSection
          title={t("ports")}
          action={renderEdit({
            section: "ports",
            ports: service.ports,
            exposedPorts,
            containerState,
          })}
        >
          {service.ports.length === 0 ? (
            <p className="text-sm text-slate-500">{t("noPorts")}</p>
          ) : (
            <ul className="flex flex-col gap-2 font-mono text-sm text-slate-300">
              {service.ports.map(port => (
                <li key={port.external}>{`${port.external} → ${port.internal}`}</li>
              ))}
            </ul>
          )}
          {exposedPorts.length > 0 && (
            <p className="mt-3 text-xs text-slate-500">
              {t("exposedPorts", { ports: exposedPorts.join(", ") })}
            </p>
          )}
        </ServiceInfoSection>
        <ServiceInfoSection
          title={t("volumes")}
          action={renderEdit({
            section: "volumes",
            volumes: service.volumes,
            options: volumeOptions,
            containerState,
          })}
        >
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
      <ServiceInfoSection title={t("domains")}>
        {service.domains.length === 0 ? (
          <p className="text-sm text-slate-500">{t("noDomains")}</p>
        ) : (
          <ul className="flex flex-col gap-2 font-mono text-sm break-all text-slate-300">
            {service.domains.map(({ hostname, port }) => (
              <li key={hostname}>
                <a
                  href={`https://${hostname}`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline-offset-2 hover:text-white hover:underline"
                >
                  {hostname}
                </a>
                {` → ${port}`}
              </li>
            ))}
          </ul>
        )}
      </ServiceInfoSection>
      <ServiceInfoSection
        title={t("variables")}
        action={renderEdit({ section: "variables", isGitHub, variables: service.environmentVariables })}
      >
        {service.environmentVariables.length === 0 && inheritedVariables.length === 0 ? (
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
                {inheritedVariables.map(variable => {
                  const isOverridden = service.environmentVariables.some(({ key }) => key === variable.name);
                  const source = services.find(({ id: serviceId }) => serviceId === variable.sourceServiceId);
                  return (
                    <tr key={`${variable.linkId}-${variable.sharedVariableId}`}>
                      <td className="py-2 pr-4 align-top">
                        <span className={isOverridden ? "font-mono text-slate-500 line-through" : "font-mono text-slate-200"}>
                          {variable.name}
                        </span>
                        <p className="text-xs text-slate-500">
                          {t("inheritedFrom", { name: source?.name ?? variable.sourceServiceId })}
                          {isOverridden && ` · ${t("overridden")}`}
                        </p>
                      </td>
                      <td className="py-2 pr-4 align-top font-mono break-all text-slate-400">
                        {variable.isSecret ? (
                          <span className="rounded border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-xs text-amber-400">
                            {t("secret")}
                          </span>
                        ) : variable.value}
                        {variable.unset.length > 0 && (
                          <p className="font-sans text-xs text-amber-400">
                            {t("inheritedUnset", { names: variable.unset.join(", ") })}
                          </p>
                        )}
                      </td>
                      {isGitHub && <td className="py-2 align-top text-slate-400">{tScopes("runtime")}</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </ServiceInfoSection>
    </div>
  );
};

export default ServiceInfo;
