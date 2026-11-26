import { getTranslations } from "next-intl/server";
import { addDomainAction, removeDomainAction } from "~/actions/domain";
import DomainProblem from "~/components/domains/DomainProblem";
import DomainStatusBadge from "~/components/domains/DomainStatusBadge";
import ZonesNotice from "~/components/domains/ZonesNotice";
import AddDomainForm from "~/components/services/AddDomainForm";
import RemoveDomainForm from "~/components/services/RemoveDomainForm";
import Card from "~/components/ui/card";
import { getDomainStatuses } from "~/core/cloudflare/domains";
import { loadDomainZones } from "~/data/cloudflare";
import type { ServiceDetails } from "~/data/services";

export type ServiceDomainsProps = {
  service: Pick<ServiceDetails, "id" | "domains" | "ports">,
};

const ServiceDomains = async ({ service }: ServiceDomainsProps) => {
  const [
    domainZones,
    statuses,
    t,
  ] = await Promise.all([
    loadDomainZones(),
    getDomainStatuses(service.domains.map(({ hostname }) => hostname)),
    getTranslations("ServicePage.settings.domains"),
  ]);

  return (
    <Card className="flex flex-col gap-6 p-6">
      <div>
        <h2 className="text-base font-semibold text-slate-100">{t("title")}</h2>
        <p className="mt-1 text-xs text-slate-400">{t("description")}</p>
      </div>
      {domainZones.state === "ready" && domainZones.zones.length > 0 ? (
        <AddDomainForm
          action={addDomainAction.bind(null, service.id)}
          zones={domainZones.zones}
          defaultPort={service.ports.at(0)?.internal}
        />
      ) : (
        <ZonesNotice state={domainZones.state} />
      )}
      {service.domains.length === 0 ? (
        <p className="text-sm text-slate-500">{t("empty")}</p>
      ) : (
        <ul className="divide-y divide-slate-800/80">
          {service.domains.map(({ hostname, port }, index) => (
            <li key={hostname} className="space-y-2 py-2">
              <div className="flex min-h-8 items-center gap-3">
                <span className="min-w-0 font-mono text-sm break-all text-slate-300">
                  <a
                    href={`https://${hostname}`}
                    target="_blank"
                    rel="noreferrer"
                    className="underline-offset-2 hover:text-white hover:underline"
                  >
                    {hostname}
                  </a>
                  {` → ${port}`}
                </span>
                <DomainStatusBadge state={statuses[index].state} />
                <div className="ml-auto shrink-0">
                  <RemoveDomainForm action={removeDomainAction.bind(null, service.id, hostname)} hostname={hostname} />
                </div>
              </div>
              <DomainProblem hostname={hostname} status={statuses[index]} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};

export default ServiceDomains;
