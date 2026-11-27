"use client";

import { cn } from "@omer-x/tailwind-ui-kit/utils";
import { useFormatter } from "next-intl";
import type { ByteProgress } from "~/core/docker/pull-progress";
import usePullProgress from "./usePullProgress";

export type PullProgressBarsProps = {
  serviceId: string,
  labels: {
    download: string,
    extract: string,
  },
  className?: string,
};

const BYTES_PER_MEGABYTE = 1_000_000;

type ProgressBarProps = {
  label: string,
  progress: ByteProgress | undefined,
};

const ProgressBar = ({ label, progress }: ProgressBarProps) => {
  const format = useFormatter();
  // Docker only knows the size of a layer once its download starts, so the total can grow
  const ratio = progress && progress.total > 0 ? Math.min(progress.current / progress.total, 1) : 0;
  const formatMegabytes = (bytes: number) => format.number(bytes / BYTES_PER_MEGABYTE, {
    style: "unit",
    unit: "megabyte",
    maximumFractionDigits: 1,
  });

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-medium text-slate-400">{label}</span>
        <span className="font-mono text-slate-500">
          {progress && progress.total > 0
            ? `${formatMegabytes(progress.current)} / ${formatMegabytes(progress.total)}`
            : format.number(0, { style: "percent" })}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(ratio * 100)}
        className="h-1.5 overflow-hidden rounded-full bg-slate-800"
      >
        <div
          className="h-full rounded-full bg-cyan-400 transition-[width] duration-500"
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  );
};

const PullProgressBars = ({ serviceId, labels, className }: PullProgressBarsProps) => {
  const progress = usePullProgress(serviceId);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <ProgressBar label={labels.download} progress={progress?.download} />
      <ProgressBar label={labels.extract} progress={progress?.extract} />
    </div>
  );
};

export default PullProgressBars;
