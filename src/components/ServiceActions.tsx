"use client";

import { faPlay } from "@fortawesome/free-solid-svg-icons/faPlay";
import { faRotateRight } from "@fortawesome/free-solid-svg-icons/faRotateRight";
import { faSpinner } from "@fortawesome/free-solid-svg-icons/faSpinner";
import { faStop } from "@fortawesome/free-solid-svg-icons/faStop";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { restartService, startService, stopService } from "~/actions/service";
import Button from "~/components/ui/button";
import type { ContainerRuntimeStatus } from "~/core/docker/status";

export type ServiceActionsProps = {
  serviceId: string,
  status: ContainerRuntimeStatus,
};

const ServiceActions = ({
  serviceId,
  status,
}: ServiceActionsProps) => {
  const t = useTranslations("DashboardPage.service.actions");
  const [isPending, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<"start" | "stop" | "restart" | null>(null);

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
  const isPulling = status === "pulling";
  const isStartBusy = pendingAction === "start" || isPulling || isBuilding;

  const startButtonLabel = isPulling
    ? t("pulling")
    : isBuilding
      ? t("building")
      : pendingAction === "start"
        ? t("starting")
        : t("start");

  const startIconColor = isPulling
    ? "text-cyan-400"
    : isBuilding
      ? "text-sky-400"
      : "text-emerald-400";

  return (
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
            <span>{pendingAction === "stop" ? t("stopping") : t("stop")}</span>
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
            <span>{pendingAction === "restart" ? t("restarting") : t("restart")}</span>
          </Button>
        </>
      ) : (
        <Button
          size="xs"
          variant="secondary"
          disabled={isPending || isBuilding || isPulling}
          onClick={handleStart}
          className="gap-1.5"
        >
          <FontAwesomeIcon
            icon={isStartBusy ? faSpinner : faPlay}
            className={isStartBusy ? `size-3 animate-spin ${startIconColor}` : "size-3 text-emerald-400"}
          />
          <span>{startButtonLabel}</span>
        </Button>
      )}
    </div>
  );
};

export default ServiceActions;
