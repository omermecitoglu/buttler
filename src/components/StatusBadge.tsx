import { faRotate } from "@fortawesome/free-solid-svg-icons/faRotate";
import { faSpinner } from "@fortawesome/free-solid-svg-icons/faSpinner";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { cn } from "@omer-x/tailwind-ui-kit/utils";
import type { ContainerRuntimeStatus } from "~/core/docker/status";

export type StatusBadgeProps = {
  status: ContainerRuntimeStatus,
  label: string,
  className?: string,
};

const statusStyles: Record<ContainerRuntimeStatus, { badge: string, dot: string }> = {
  running: {
    badge: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
    dot: "bg-emerald-400 animate-pulse",
  },
  stopped: {
    badge: "border-slate-700 bg-slate-800 text-slate-400",
    dot: "bg-slate-500",
  },
  exited: {
    badge: "border-rose-500/20 bg-rose-500/10 text-rose-400",
    dot: "bg-rose-400",
  },
  building: {
    badge: "border-sky-500/20 bg-sky-500/10 text-sky-400",
    dot: "bg-sky-400",
  },
  restarting: {
    badge: "border-amber-500/20 bg-amber-500/10 text-amber-400",
    dot: "bg-amber-400",
  },
};

const StatusBadge = ({ status, label, className }: StatusBadgeProps) => {
  const current = statusStyles[status];

  return (
    <span
      className={cn([
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-wide",
        current.badge,
        className,
      ])}
    >
      {status === "building" ? (
        <FontAwesomeIcon icon={faSpinner} className="size-2.5 animate-spin" />
      ) : status === "restarting" ? (
        <FontAwesomeIcon icon={faRotate} className="size-2.5 animate-spin" />
      ) : (
        <span className={cn("size-1.5 rounded-full", current.dot)} />
      )}
      <span>{label}</span>
    </span>
  );
};

export default StatusBadge;
