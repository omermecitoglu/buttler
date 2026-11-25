import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { removeDashboardDomainAction, setDashboardDomainAction } from "~/actions/dashboard-domain";
import DomainProblem from "~/components/domains/DomainProblem";
import DomainStatusBadge from "~/components/domains/DomainStatusBadge";
import ZonesNotice from "~/components/domains/ZonesNotice";
import DashboardDomainForm from "~/components/settings/DashboardDomainForm";
import GitHubAppAddresses from "~/components/settings/GitHubAppAddresses";
import RemoveDashboardDomainModal from "~/components/settings/RemoveDashboardDomainModal";
import Card from "~/components/ui/card";
import { getDomainStatuses } from "~/core/cloudflare/domains";
import { loadDomainZones } from "~/data/cloudflare";
import db from "~/database";
import getDashboardDomain from "~/operations/getDashboardDomain";

const DashboardDomain = async () => {
  await connection();
  const [
    hostname,
    domainZones,
    t,
  ] = await Promise.all([
    getDashboardDomain(db),
    loadDomainZones(),
    getTranslations("SettingsPage.domain"),
  ]);
  const status = hostname === null ? null : (await getDomainStatuses([hostname]))[0];

  return (
    <Card className="flex max-w-2xl flex-col gap-6 p-6">
      <div>
        <h2 className="text-base font-semibold text-slate-100">{t("title")}</h2>
        <p className="mt-1 text-xs text-slate-400">{t("description")}</p>
        <p className="mt-1 text-xs text-slate-400">{t("warning")}</p>
      </div>
      {hostname !== null && status && (
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="min-w-0 font-mono text-sm break-all text-slate-300">{hostname}</span>
            <DomainStatusBadge state={status.state} />
          </div>
          <DomainProblem hostname={hostname} status={status} />
        </div>
      )}
      {domainZones.state === "ready" && domainZones.zones.length > 0 ? (
        <DashboardDomainForm
          key={hostname}
          action={setDashboardDomainAction}
          zones={domainZones.zones}
          currentHostname={hostname}
        />
      ) : (
        <ZonesNotice state={domainZones.state} />
      )}
      {hostname !== null && (
        <>
          <GitHubAppAddresses hostname={hostname} />
          <div>
            <RemoveDashboardDomainModal action={removeDashboardDomainAction} hostname={hostname} />
          </div>
        </>
      )}
    </Card>
  );
};

export default DashboardDomain;
