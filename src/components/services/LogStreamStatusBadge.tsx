import { cn } from "@omer-x/tailwind-ui-kit/utils";
import type { LogStreamStatus } from "./useContainerLogs";

const dotClasses: Record<LogStreamStatus, string> = {
  connecting: "animate-pulse bg-sky-400",
  live: "bg-emerald-400",
  reconnecting: "animate-pulse bg-amber-400",
  stopped: "bg-slate-500",
  failed: "bg-rose-400",
};

export type LogStreamStatusBadgeProps = {
  status: LogStreamStatus,
  label: string,
};

const LogStreamStatusBadge = ({ status, label }: LogStreamStatusBadgeProps) => (
  <span role="status" className="inline-flex items-center gap-2 text-xs font-medium text-slate-400">
    <span className={cn("size-2 rounded-full", dotClasses[status])} />
    {label}
  </span>
);

export default LogStreamStatusBadge;
