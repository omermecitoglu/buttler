"use client";

import { faArrowsRotate } from "@fortawesome/free-solid-svg-icons/faArrowsRotate";
import { faCheck } from "@fortawesome/free-solid-svg-icons/faCheck";
import { faCopy } from "@fortawesome/free-solid-svg-icons/faCopy";
import { faDownload } from "@fortawesome/free-solid-svg-icons/faDownload";
import { faEraser } from "@fortawesome/free-solid-svg-icons/faEraser";
import { faPause } from "@fortawesome/free-solid-svg-icons/faPause";
import { faPlay } from "@fortawesome/free-solid-svg-icons/faPlay";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useTranslations } from "next-intl";
import { useLayoutEffect, useRef, useState } from "react";
import Button from "~/components/ui/button";
import Card from "~/components/ui/card";
import Input from "~/components/ui/input";
import ContainerLogLine from "./ContainerLogLine";
import LogStreamStatusBadge from "./LogStreamStatusBadge";
import useContainerLogs, { type NumberedLogLine } from "./useContainerLogs";

/** Distance to the bottom in pixels, which is still considered as the bottom */
const BOTTOM_THRESHOLD = 24;

function formatLines(lines: NumberedLogLine[]) {
  return lines.map(line => (line.timestamp ? `${line.timestamp} ${line.text}` : line.text)).join("\n");
}

export type ContainerLogsProps = {
  serviceId: string,
  serviceName: string,
  isRunning: boolean,
};

const ContainerLogs = ({ serviceId, serviceName, isRunning }: ContainerLogsProps) => {
  const t = useTranslations("ServicePage.logs");
  const { lines, status, clear, reconnect } = useContainerLogs(serviceId, isRunning);
  const [filter, setFilter] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const viewport = useRef<HTMLDivElement>(null);
  const lastScrollTop = useRef(0);

  const keyword = filter.trim().toLowerCase();
  const visibleLines = keyword ? lines.filter(line => line.text.toLowerCase().includes(keyword)) : lines;

  useLayoutEffect(() => {
    if (autoScroll && viewport.current) {
      viewport.current.scrollTop = viewport.current.scrollHeight;
    }
  }, [autoScroll, lines, keyword]);

  const handleScroll = () => {
    if (!viewport.current) return;
    const { scrollTop, scrollHeight, clientHeight } = viewport.current;
    const isScrolledUp = scrollTop < lastScrollTop.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight <= BOTTOM_THRESHOLD;
    lastScrollTop.current = scrollTop;
    if (isScrolledUp && !isAtBottom) setAutoScroll(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(visibleLines.map(line => line.text).join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard error
    }
  };

  const handleDownload = () => {
    const url = URL.createObjectURL(new Blob([formatLines(lines)], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${serviceName}.log`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const isEnded = status === "stopped" || status === "failed";
  const message = lines.length > 0 ? t("noMatches") : status === "connecting" ? t("loading") : t("empty");

  return (
    <Card className="flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <LogStreamStatusBadge status={status} label={t(`status.${status}`)} />
        <div className="flex flex-wrap gap-2">
          <Button
            size="xs"
            variant="outline"
            aria-pressed={autoScroll}
            onClick={() => setAutoScroll(current => !current)}
            className="gap-1.5"
          >
            <FontAwesomeIcon icon={autoScroll ? faPause : faPlay} className="size-3 text-slate-400" />
            <span>{autoScroll ? t("pauseScroll") : t("resumeScroll")}</span>
          </Button>
          <Button size="xs" variant="outline" disabled={visibleLines.length === 0} onClick={handleCopy} className="gap-1.5">
            <FontAwesomeIcon icon={copied ? faCheck : faCopy} className="size-3 text-slate-400" />
            <span>{copied ? t("copied") : t("copy")}</span>
          </Button>
          <Button size="xs" variant="outline" disabled={lines.length === 0} onClick={handleDownload} className="gap-1.5">
            <FontAwesomeIcon icon={faDownload} className="size-3 text-slate-400" />
            <span>{t("download")}</span>
          </Button>
          <Button size="xs" variant="outline" disabled={lines.length === 0} onClick={clear} className="gap-1.5">
            <FontAwesomeIcon icon={faEraser} className="size-3 text-slate-400" />
            <span>{t("clear")}</span>
          </Button>
          {isEnded && (
            <Button size="xs" variant="secondary" onClick={reconnect} className="gap-1.5">
              <FontAwesomeIcon icon={faArrowsRotate} className="size-3 text-slate-400" />
              <span>{t("reconnect")}</span>
            </Button>
          )}
        </div>
      </div>
      <Input
        type="search"
        size="sm"
        value={filter}
        onChange={event => setFilter(event.target.value)}
        placeholder={t("filter")}
        aria-label={t("filter")}
      />
      {isEnded && (
        <p className={status === "failed" ? "text-sm text-rose-400" : "text-sm text-slate-400"}>
          {status === "failed" ? t("error") : t("notRunning")}
        </p>
      )}
      <div
        ref={viewport}
        role="log"
        aria-live="off"
        onScroll={handleScroll}
        className="h-[60dvh] overflow-y-auto rounded-xl border border-slate-800/80 bg-slate-950 py-3 font-mono text-xs leading-relaxed"
      >
        {visibleLines.length > 0
          ? visibleLines.map(line => <ContainerLogLine key={line.number} line={line} />)
          : <p className="py-16 text-center font-sans text-sm text-slate-500">{message}</p>}
      </div>
    </Card>
  );
};

export default ContainerLogs;
