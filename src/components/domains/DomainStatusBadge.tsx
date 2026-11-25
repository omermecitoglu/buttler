import { cn } from "@omer-x/tailwind-ui-kit/utils";
import { getTranslations } from "next-intl/server";
import type { DomainStatus } from "~/core/cloudflare/domains";

const stateClasses: Record<DomainStatus["state"], string> = {
  active: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
  pending: "border-sky-500/20 bg-sky-500/10 text-sky-400",
  failed: "border-rose-500/20 bg-rose-500/10 text-rose-400",
  disconnected: "border-slate-700 bg-slate-800/50 text-slate-400",
};

export type DomainStatusBadgeProps = {
  state: DomainStatus["state"],
};

const DomainStatusBadge = async ({ state }: DomainStatusBadgeProps) => {
  const t = await getTranslations("Domains.states");
  return (
    <span className={cn("shrink-0 rounded border px-1.5 py-0.5 text-xs", stateClasses[state])}>{t(state)}</span>
  );
};

export default DomainStatusBadge;
