"use client";

import { Dialog } from "@base-ui/react/dialog";
import { faCheck } from "@fortawesome/free-solid-svg-icons/faCheck";
import { faCopy } from "@fortawesome/free-solid-svg-icons/faCopy";
import { faSpinner } from "@fortawesome/free-solid-svg-icons/faSpinner";
import { faTerminal } from "@fortawesome/free-solid-svg-icons/faTerminal";
import { faXmark } from "@fortawesome/free-solid-svg-icons/faXmark";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AnimatedPopup, DialogBackdrop, DialogTitle } from "@omer-x/tailwind-ui-kit/dialog";
import { cn } from "@omer-x/tailwind-ui-kit/utils";
import { useEffect, useState } from "react";
import Button from "~/components/ui/button";

export type LogsModalLabels = {
  title: string,
  close: string,
  copy: string,
  copied: string,
  loading: string,
  empty: string,
  error: string,
};

export type LogsModalProps = {
  open: boolean,
  onOpenChange: (open: boolean) => void,
  containerId: string | null,
  serviceName: string,
  labels: LogsModalLabels,
};

const LogsModal = ({
  open,
  onOpenChange,
  containerId,
  serviceName,
  labels,
}: LogsModalProps) => {
  const [logs, setLogs] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open || !containerId) {
      setLogs(null);
      setError(null);
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    fetch(`/api/logs?container=${encodeURIComponent(containerId)}&limit=200`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch logs");
        return res.json() as Promise<{ content: string }>;
      })
      .then(data => {
        if (active) {
          setLogs(data.content);
          setLoading(false);
        }
      })
      .catch(err => {
        if (active) {
          setError(err instanceof Error ? err.message : labels.error);
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [open, containerId, labels.error]);

  const handleCopy = async () => {
    if (!logs) return;
    await navigator.clipboard.writeText(logs);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop render={<DialogBackdrop />} />
        <Dialog.Popup
          render={(
            <AnimatedPopup
              className={cn(
                "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
                "w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl backdrop-blur-xl",
              )}
            />
          )}
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
              <FontAwesomeIcon icon={faTerminal} className="size-4 text-slate-400" />
              <DialogTitle className="text-base font-semibold text-slate-100">
                {serviceName}
                {" — "}
                <span className="font-normal text-slate-400">{labels.title}</span>
              </DialogTitle>
            </div>
            <div className="flex items-center gap-2">
              {logs && (
                <Button
                  size="xs"
                  variant="outline"
                  onClick={handleCopy}
                  className="gap-1.5"
                >
                  <FontAwesomeIcon icon={copied ? faCheck : faCopy} className="size-3 text-slate-400" />
                  <span>{copied ? labels.copied : labels.copy}</span>
                </Button>
              )}
              <Button
                size="xs"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                aria-label={labels.close}
                className="size-7 p-0"
              >
                <FontAwesomeIcon icon={faXmark} className="size-3.5" />
              </Button>
            </div>
          </div>
          <div className="mt-4">
            {loading && (
              <div className="flex h-72 items-center justify-center gap-2 text-sm text-slate-400">
                <FontAwesomeIcon icon={faSpinner} className="size-4 animate-spin text-slate-400" />
                <span>{labels.loading}</span>
              </div>
            )}
            {!loading && error && (
              <div className="flex h-72 items-center justify-center text-sm text-rose-400">
                <span>{error}</span>
              </div>
            )}
            {!loading && !error && !logs && (
              <div className="flex h-72 items-center justify-center text-sm text-slate-500">
                <span>{labels.empty}</span>
              </div>
            )}
            {!loading && !error && logs && (
              <pre className="max-h-96 overflow-x-auto overflow-y-auto rounded-xl border border-slate-800/80 bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-300 select-text">
                {logs}
              </pre>
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default LogsModal;
