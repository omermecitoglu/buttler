import { getTranslations } from "next-intl/server";
import { connectCloudflareAction } from "~/actions/cloudflare";
import { setDashboardDomainAction } from "~/actions/dashboard-domain";
import { retryDomainAction } from "~/actions/setup";
import DomainActionForm from "~/components/domains/DomainActionForm";
import DomainProblem from "~/components/domains/DomainProblem";
import DomainStatusBadge from "~/components/domains/DomainStatusBadge";
import ConnectCloudflareForm from "~/components/settings/ConnectCloudflareForm";
import DashboardDomainForm from "~/components/settings/DashboardDomainForm";
import ChangeDomainLink from "~/components/setup/ChangeDomainLink";
import ReachabilityMessage from "~/components/setup/ReachabilityMessage";
import type { SetupProgress } from "~/core/setup-progress";
import { loadDomainZones } from "~/data/cloudflare";
import { Link } from "~/i18n/navigation";

type DomainFormProps = {
  hostname: string | null,
};

const DomainForm = async ({ hostname }: DomainFormProps) => {
  const domainZones = await loadDomainZones();
  if (domainZones.state === "ready" && domainZones.zones.length > 0) {
    return (
      <DashboardDomainForm
        key={hostname}
        action={setDashboardDomainAction}
        zones={domainZones.zones}
        currentHostname={hostname}
      />
    );
  }
  const t = await getTranslations("Domains");
  return (
    <div className="space-y-4">
      <p className="text-sm text-amber-400">{t(`zones.${domainZones.state}`)}</p>
      <DomainActionForm action={retryDomainAction} label={t("retry")} pendingLabel={t("retrying")} />
      <ConnectCloudflareForm action={connectCloudflareAction} isLost />
    </div>
  );
};

export type DomainStepProps = {
  progress: Extract<SetupProgress, { step: "domain" | "github" }>,
  /** The page must not disappear when the domain changes */
  isLocal: boolean,
};

const DomainStep = async ({ progress, isLocal }: DomainStepProps) => {
  const t = await getTranslations("InstallPage.domain");
  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-400">{t("description")}</p>
      {progress.step === "domain" && progress.hostname !== null && (
        <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-950/50 p-4">
          <div className="flex items-center gap-3">
            <span className="min-w-0 font-mono text-sm break-all text-slate-300">{progress.hostname}</span>
            {progress.status.state !== "active" && <DomainStatusBadge state={progress.status.state} />}
          </div>
          {progress.problem ? (
            <ReachabilityMessage hostname={progress.hostname} problem={progress.problem} />
          ) : (
            <DomainProblem hostname={progress.hostname} status={progress.status} />
          )}
        </div>
      )}
      {isLocal ? <DomainForm hostname={progress.hostname} /> : <ChangeDomainLink />}
      {progress.step === "github" && (
        <Link href="/install" className="inline-block text-sm font-medium text-slate-200 underline hover:text-white">
          {t("keep", { hostname: progress.hostname })}
        </Link>
      )}
    </div>
  );
};

export default DomainStep;
