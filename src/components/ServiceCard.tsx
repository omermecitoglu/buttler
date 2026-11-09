import { faNetworkWired } from "@fortawesome/free-solid-svg-icons/faNetworkWired";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import ServiceActions, { type ServiceActionLabels } from "~/components/ServiceActions";
import ServiceTypeBadge from "~/components/ServiceTypeBadge";
import StatusBadge from "~/components/StatusBadge";
import Card from "~/components/ui/card";
import type { ContainerRuntimeStatus } from "~/core/docker/status";
import type { ServiceWithRuntime } from "~/data/services";
import { Link } from "~/i18n/navigation";
import type { LogsModalLabels } from "./LogsModal";

export type ServiceCardProps = {
  service: ServiceWithRuntime,
  labels: {
    source: string,
    ports: string,
    ipAddress: string,
    uptime: string,
    none: string,
    notAvailable: string,
    actions: ServiceActionLabels,
    status: Record<ContainerRuntimeStatus, string>,
    types: Record<"github" | "dockerhub" | "system", string>,
  },
  logsLabels: LogsModalLabels,
};

const ServiceCard = ({
  service,
  labels,
  logsLabels,
}: ServiceCardProps) => {
  const sourceText = service.repository
    ? `${service.repository}${service.branch ? `:${service.branch}` : ""}`
    : labels.notAvailable;

  const configuredPortsText = service.ports.length > 0
    ? service.ports.map(p => `${p.external}:${p.internal}`).join(", ")
    : labels.none;

  const liveIpText = service.runtime.ipAddresses.length > 0
    ? service.runtime.ipAddresses.join(", ")
    : null;

  const uptimeText = service.runtime.uptime ?? labels.notAvailable;

  return (
    <Card className="flex flex-col justify-between gap-5 p-6 transition-all hover:border-slate-700">
      <div className="flex flex-col gap-4">
        {/* Card Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1 min-w-0">
            <Link
              href={{ pathname: "/services/[serviceId]", params: { serviceId: service.id } }}
              className="truncate text-base font-semibold text-slate-100 hover:text-white"
            >
              {service.name}
            </Link>
            <div className="flex items-center gap-2">
              <ServiceTypeBadge
                type={service.type as "github" | "dockerhub" | "system"}
                label={labels.types[service.type as "github" | "dockerhub" | "system"]}
              />
            </div>
          </div>
          <StatusBadge
            status={service.runtime.status}
            label={labels.status[service.runtime.status]}
          />
        </div>
        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-800/80 bg-slate-950/40 p-3.5 text-xs">
          <div>
            <span className="block font-medium text-slate-500">{labels.source}</span>
            <span className="mt-0.5 block truncate font-mono text-slate-300" title={sourceText}>
              {sourceText}
            </span>
          </div>
          <div>
            <span className="block font-medium text-slate-500">{labels.ports}</span>
            <span className="mt-0.5 block truncate font-mono text-slate-300">
              {configuredPortsText}
            </span>
          </div>
          <div>
            <span className="block font-medium text-slate-500">{labels.uptime}</span>
            <span className="mt-0.5 block truncate text-slate-300">
              {uptimeText}
            </span>
          </div>
          <div>
            <span className="block font-medium text-slate-500">{labels.ipAddress}</span>
            <span className="mt-0.5 flex items-center gap-1 font-mono text-slate-300">
              {liveIpText ? (
                <>
                  <FontAwesomeIcon icon={faNetworkWired} className="size-2.5 text-slate-500" />
                  <span className="truncate">{liveIpText}</span>
                </>
              ) : (
                <span className="text-slate-500">{labels.notAvailable}</span>
              )}
            </span>
          </div>
        </div>
      </div>
      {/* Card Footer Actions */}
      <div className="border-t border-slate-800/80 pt-3">
        <ServiceActions
          serviceId={service.id}
          serviceName={service.name}
          status={service.runtime.status}
          containerId={service.runtime.containerId}
          labels={labels.actions}
          logsLabels={logsLabels}
        />
      </div>
    </Card>
  );
};

export default ServiceCard;
