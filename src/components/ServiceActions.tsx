"use client";

import { faArrowRight } from "@fortawesome/free-solid-svg-icons/faArrowRight";
import { faFileLines } from "@fortawesome/free-solid-svg-icons/faFileLines";
import { faPlay } from "@fortawesome/free-solid-svg-icons/faPlay";
import { faRotateRight } from "@fortawesome/free-solid-svg-icons/faRotateRight";
import { faSpinner } from "@fortawesome/free-solid-svg-icons/faSpinner";
import { faStop } from "@fortawesome/free-solid-svg-icons/faStop";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useState, useTransition } from "react";
import { restartService, startService, stopService } from "~/actions/service";
import LogsModal, { type LogsModalLabels } from "~/components/LogsModal";
import Button from "~/components/ui/button";
import type { ContainerRuntimeStatus } from "~/core/docker/status";
import { Link } from "~/i18n/navigation";

export type ServiceActionLabels = {
  start: string,
  stop: string,
  restart: string,
  logs: string,
  details: string,
  starting: string,
  stopping: string,
  restarting: string,
};

export type ServiceActionsProps = {
  serviceId: string,
  serviceName: string,
  status: ContainerRuntimeStatus,
  containerId: string | null,
  labels: ServiceActionLabels,
  logsLabels: LogsModalLabels,
};

const ServiceActions = ({
  serviceId,
  serviceName,
  status,
  containerId,
  labels,
  logsLabels,
}: ServiceActionsProps) => {
  const [isPending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<"start" | "stop" | "restart" | null>(null);
  const [logsOpen, setLogsOpen] = useState(false);

  const handleStart = () => {
    setPendingAction("start");
    startTransition(async () => {
      try {
        await startService(serviceId);
      } finally {
        setPendingAction(null);
      }
    });
  };

  const handleStop = () => {
    setPendingAction("stop");
    startTransition(async () => {
      try {
        await stopService(serviceId);
      } finally {
        setPendingAction(null);
      }
    });
  };

  const handleRestart = () => {
    setPendingAction("restart");
    startTransition(async () => {
      try {
        await restartService(serviceId);
      } finally {
        setPendingAction(null);
      }
    });
  };

  const isRunning = status === "running";
  const isBuilding = status === "building";

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {isRunning ? (
          <>
            <Button
              size="xs"
              variant="outline"
              disabled={isPending}
              onClick={handleStop}
              className="gap-1.5 text-slate-300 hover:text-rose-400 hover:border-rose-500/40"
            >
              <FontAwesomeIcon
                icon={pendingAction === "stop" ? faSpinner : faStop}
                className={pendingAction === "stop" ? "size-3 animate-spin text-rose-400" : "size-3 text-rose-400"}
              />
              <span>{pendingAction === "stop" ? labels.stopping : labels.stop}</span>
            </Button>
            <Button
              size="xs"
              variant="secondary"
              disabled={isPending}
              onClick={handleRestart}
              className="gap-1.5"
            >
              <FontAwesomeIcon
                icon={pendingAction === "restart" ? faSpinner : faRotateRight}
                className={pendingAction === "restart" ? "size-3 animate-spin text-slate-400" : "size-3 text-slate-400"}
              />
              <span>{pendingAction === "restart" ? labels.restarting : labels.restart}</span>
            </Button>
          </>
        ) : (
          <Button
            size="xs"
            variant="secondary"
            disabled={isPending || isBuilding}
            onClick={handleStart}
            className="gap-1.5"
          >
            <FontAwesomeIcon
              icon={pendingAction === "start" ? faSpinner : faPlay}
              className={pendingAction === "start" ? "size-3 animate-spin text-emerald-400" : "size-3 text-emerald-400"}
            />
            <span>{pendingAction === "start" ? labels.starting : labels.start}</span>
          </Button>
        )}
        {containerId && (
          <Button
            size="xs"
            variant="ghost"
            onClick={() => setLogsOpen(true)}
            className="gap-1.5 text-slate-400 hover:text-slate-200"
          >
            <FontAwesomeIcon icon={faFileLines} className="size-3 text-slate-500" />
            <span>{labels.logs}</span>
          </Button>
        )}
        <Link
          href={{ pathname: "/services/[serviceId]", params: { serviceId } }}
          className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-slate-400 transition-colors hover:text-slate-100"
        >
          <span>{labels.details}</span>
          <FontAwesomeIcon icon={faArrowRight} className="size-2.5" />
        </Link>
      </div>
      <LogsModal
        open={logsOpen}
        onOpenChange={setLogsOpen}
        containerId={containerId}
        serviceName={serviceName}
        labels={logsLabels}
      />
    </>
  );
};

export default ServiceActions;
