import { cn } from "@omer-x/tailwind-ui-kit/utils";
import { memo } from "react";
import type { NumberedLogLine } from "./useContainerLogs";

const timeFormat = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  fractionalSecondDigits: 3,
  hourCycle: "h23",
});

export type ContainerLogLineProps = {
  line: NumberedLogLine,
};

const ContainerLogLine = ({ line }: ContainerLogLineProps) => (
  <div className={cn("flex gap-3 px-4 hover:bg-slate-900", line.stream === "stderr" && "bg-rose-500/10 hover:bg-rose-500/15")}>
    <span className="w-10 shrink-0 text-right text-slate-600 select-none">{line.number}</span>
    {line.timestamp && (
      <time dateTime={line.timestamp} title={line.timestamp} className="shrink-0 text-slate-500 select-none">
        {timeFormat.format(new Date(line.timestamp))}
      </time>
    )}
    <span className={cn("min-w-0 wrap-anywhere whitespace-pre-wrap", line.stream === "stderr" ? "text-rose-300" : "text-slate-300")}>
      {line.text}
    </span>
  </div>
);

export default memo(ContainerLogLine);
