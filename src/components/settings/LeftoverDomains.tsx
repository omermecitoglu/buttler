import { getTranslations } from "next-intl/server";
import { syncDomainsAction } from "~/actions/domain";
import DomainActionForm from "~/components/domains/DomainActionForm";
import { getDomainStatuses, getLeftoverHostnames } from "~/core/cloudflare/domains";

/** The removed domains whose DNS records couldn't be deleted yet */
const LeftoverDomains = async () => {
  const hostnames = await getLeftoverHostnames();
  if (hostnames.length === 0) return null;
  const [
    statuses,
    t,
    tDomains,
  ] = await Promise.all([
    getDomainStatuses(hostnames),
    getTranslations("SettingsPage.cloudflare.leftovers"),
    getTranslations("Domains"),
  ]);

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-200">{t("title")}</h3>
        <p className="mt-1 text-xs text-slate-400">{t("description")}</p>
      </div>
      <ul className="divide-y divide-slate-800/80">
        {hostnames.map((hostname, index) => {
          const { failure, details } = statuses[index];
          return (
            <li key={hostname} className="space-y-1 py-2">
              <p className="font-mono text-sm break-all text-slate-300">{hostname}</p>
              {failure && (
                <p className="text-xs break-words text-slate-400">
                  {tDomains(`failures.${failure}`, { hostname, details: details ?? "" })}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      <DomainActionForm action={syncDomainsAction} label={tDomains("retry")} pendingLabel={tDomains("retrying")} />
    </div>
  );
};

export default LeftoverDomains;
