"use client";

import { faArrowsRotate } from "@fortawesome/free-solid-svg-icons/faArrowsRotate";
import { faCheck } from "@fortawesome/free-solid-svg-icons/faCheck";
import { faCopy } from "@fortawesome/free-solid-svg-icons/faCopy";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import Button from "~/components/ui/button";
import Card from "~/components/ui/card";

const LINE_LIMIT = 200;

export type ContainerLogsProps = {
  containerId: string,
};

const ContainerLogs = ({ containerId }: ContainerLogsProps) => {
  const t = useTranslations("ServicePage.logs");
  const [logs, setLogs] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "failed">("loading");
  const [version, setVersion] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadLogs() {
      setStatus("loading");
      try {
        const response = await fetch(
          `/api/logs?container=${encodeURIComponent(containerId)}&limit=${LINE_LIMIT}`,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error("Failed to fetch logs");
        const { content } = await response.json() as { content: string };
        if (controller.signal.aborted) return;
        setLogs(content);
        setStatus("ready");
      } catch {
        if (!controller.signal.aborted) setStatus("failed");
      }
    }

    void loadLogs();
    return () => controller.abort();
  }, [containerId, version]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(logs);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard error
    }
  };

  const message = status === "failed"
    ? t("error")
    : logs
      ? null
      : status === "loading" ? t("loading") : t("empty");

  return (
    <Card className="flex flex-col gap-4 p-6">
      <div className="flex justify-end gap-2">
        <Button size="xs" variant="outline" disabled={!logs} onClick={handleCopy} className="gap-1.5">
          <FontAwesomeIcon icon={copied ? faCheck : faCopy} className="size-3 text-slate-400" />
          <span>{copied ? t("copied") : t("copy")}</span>
        </Button>
        <Button
          size="xs"
          variant="secondary"
          disabled={status === "loading"}
          onClick={() => setVersion(current => current + 1)}
          className="gap-1.5"
        >
          <FontAwesomeIcon
            icon={faArrowsRotate}
            className={status === "loading" ? "size-3 animate-spin text-slate-400" : "size-3 text-slate-400"}
          />
          <span>{t("refresh")}</span>
        </Button>
      </div>
      {message ? (
        <p className={status === "failed" ? "py-16 text-center text-sm text-rose-400" : "py-16 text-center text-sm text-slate-500"}>
          {message}
        </p>
      ) : (
        <pre className="max-h-[65dvh] overflow-auto rounded-xl border border-slate-800/80 bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-300 select-text">
          {logs}
        </pre>
      )}
    </Card>
  );
};

export default ContainerLogs;
