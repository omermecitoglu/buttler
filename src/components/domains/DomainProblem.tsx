import { getTranslations } from "next-intl/server";
import { syncDomainsAction, takeOverDomainAction } from "~/actions/domain";
import DomainActionForm from "~/components/domains/DomainActionForm";
import type { DomainStatus } from "~/core/cloudflare/domains";

export type DomainProblemProps = {
  hostname: string,
  status: DomainStatus,
};

/** Why a domain isn't reachable, and what can be done about it */
const DomainProblem = async ({ hostname, status: { state, failure, details } }: DomainProblemProps) => {
  if (state === "active") return null;
  const t = await getTranslations("Domains");

  if (failure === "taken" && details !== null) {
    return (
      <div className="space-y-2">
        <p className="text-xs break-words text-amber-400">{t("failures.taken", { hostname, details })}</p>
        <DomainActionForm
          action={takeOverDomainAction.bind(null, hostname, details)}
          label={t("replace")}
          pendingLabel={t("replacing")}
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs break-words text-slate-400">
        {failure ? t(`failures.${failure}`, { hostname, details: details ?? "" }) : t(`help.${state}`)}
      </p>
      {state !== "disconnected" && (
        <DomainActionForm action={syncDomainsAction} label={t("retry")} pendingLabel={t("retrying")} />
      )}
    </div>
  );
};

export default DomainProblem;
