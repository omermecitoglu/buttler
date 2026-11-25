import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { removeDashboardDomainAction, setDashboardDomainAction } from "~/actions/dashboard-domain";
import DashboardDomainForm from "~/components/settings/DashboardDomainForm";
import GitHubAppAddresses from "~/components/settings/GitHubAppAddresses";
import RemoveDashboardDomainModal from "~/components/settings/RemoveDashboardDomainModal";
import Card from "~/components/ui/card";
import db from "~/database";
import getDashboardDomain from "~/operations/getDashboardDomain";

const DashboardDomain = async () => {
  await connection();
  const [
    hostname,
    t,
  ] = await Promise.all([
    getDashboardDomain(db),
    getTranslations("SettingsPage.domain"),
  ]);

  return (
    <Card className="flex max-w-2xl flex-col gap-6 p-6">
      <div>
        <h2 className="text-base font-semibold text-slate-100">{t("title")}</h2>
        <p className="mt-1 text-xs text-slate-400">{t("description")}</p>
        <p className="mt-1 text-xs text-slate-400">{t("warning")}</p>
      </div>
      <DashboardDomainForm key={hostname} action={setDashboardDomainAction} currentHostname={hostname} />
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
