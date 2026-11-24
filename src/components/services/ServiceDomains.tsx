import { getTranslations } from "next-intl/server";
import { addDomainAction, removeDomainAction } from "~/actions/domain";
import AddDomainForm from "~/components/services/AddDomainForm";
import RemoveDomainForm from "~/components/services/RemoveDomainForm";
import Card from "~/components/ui/card";
import type { ServiceDetails } from "~/data/services";

export type ServiceDomainsProps = {
  service: Pick<ServiceDetails, "id" | "domains" | "ports">,
};

const ServiceDomains = async ({ service }: ServiceDomainsProps) => {
  const t = await getTranslations("ServicePage.settings.domains");

  return (
    <Card className="flex flex-col gap-6 p-6">
      <div>
        <h2 className="text-base font-semibold text-slate-100">{t("title")}</h2>
        <p className="mt-1 text-xs text-slate-400">{t("description")}</p>
      </div>
      <AddDomainForm
        action={addDomainAction.bind(null, service.id)}
        defaultPort={service.ports.at(0)?.internal}
      />
      {service.domains.length === 0 ? (
        <p className="text-sm text-slate-500">{t("empty")}</p>
      ) : (
        <ul className="divide-y divide-slate-800/80">
          {service.domains.map(({ hostname, port }) => (
            <li key={hostname} className="flex min-h-12 items-center gap-3 py-2">
              <span className="min-w-0 font-mono text-sm break-all text-slate-300">{`${hostname} → ${port}`}</span>
              <div className="ml-auto shrink-0">
                <RemoveDomainForm action={removeDomainAction.bind(null, service.id, hostname)} hostname={hostname} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};

export default ServiceDomains;
