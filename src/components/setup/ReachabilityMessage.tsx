import { getTranslations } from "next-intl/server";
import { retryDomainAction } from "~/actions/setup";
import DomainActionForm from "~/components/domains/DomainActionForm";
import SetupPoller from "~/components/setup/SetupPoller";
import type { ReachabilityProblem } from "~/core/reachability";

export type ReachabilityMessageProps = {
  hostname: string,
  problem: ReachabilityProblem,
};

/** Why the requests to the domain don't reach this instance. Most of it is solved by waiting. */
const ReachabilityMessage = async ({ hostname, problem: { reason, details } }: ReachabilityMessageProps) => {
  const [
    t,
    tDomains,
  ] = await Promise.all([
    getTranslations("InstallPage.domain"),
    getTranslations("Domains"),
  ]);
  return (
    <div className="space-y-2">
      <p className="text-xs break-words text-amber-400">{t(`problems.${reason}`, { hostname, details })}</p>
      <p className="text-xs text-slate-500">{t("checking")}</p>
      <DomainActionForm action={retryDomainAction} label={tDomains("retry")} pendingLabel={tDomains("retrying")} />
      <SetupPoller />
    </div>
  );
};

export default ReachabilityMessage;
