"use client";

import { Toast } from "@base-ui/react/toast";
import { faCloudArrowDown } from "@fortawesome/free-solid-svg-icons/faCloudArrowDown";
import { faHammer } from "@fortawesome/free-solid-svg-icons/faHammer";
import { faPlay } from "@fortawesome/free-solid-svg-icons/faPlay";
import { faRotateRight } from "@fortawesome/free-solid-svg-icons/faRotateRight";
import { faSpinner } from "@fortawesome/free-solid-svg-icons/faSpinner";
import { faStop } from "@fortawesome/free-solid-svg-icons/faStop";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useTranslations } from "next-intl";
import { useOptimistic, useTransition } from "react";
import { redeployService, restartService, startService, stopService, triggerBuild } from "~/actions/service";
import Button from "~/components/ui/button";
import type { ContainerRuntimeStatus } from "~/core/docker/status";
import { useRouter } from "~/i18n/navigation";

const actions = {
  start: startService,
  stop: stopService,
  restart: restartService,
  rebuild: triggerBuild,
  redeploy: redeployService,
};

type ServiceActionName = keyof typeof actions;

export type ServiceActionsProps = {
  serviceId: string,
  type: "github" | "dockerhub" | "system",
  status: ContainerRuntimeStatus,
};

const ServiceActions = ({
  serviceId,
  type,
  status,
}: ServiceActionsProps) => {
  const t = useTranslations("DashboardPage.service.actions");
  const router = useRouter();
  const toastManager = Toast.useToastManager();
  const [isPending, startTransition] = useTransition();
  // Falls back to null with the refreshed status, when the action is completed
  const [pendingAction, setPendingAction] = useOptimistic<ServiceActionName | null>(null);

  const run = (name: ServiceActionName) => {
    startTransition(async () => {
      setPendingAction(name);
      try {
        await toastManager.promise(actions[name](serviceId), {
          loading: { description: t(`toasts.pending.${name}`) },
          success: ({ outcome }) => ({ description: t(`toasts.done.${outcome}`) }),
          error: { description: t(`toasts.failed.${name}`), priority: "high" },
        });
      } catch {
        // The toast shows the failure, which may have left the container in another state
        router.refresh();
      }
    });
  };

  const isBuilding = status === "building" || pendingAction === "rebuild";
  const isPulling = status === "pulling" || pendingAction === "redeploy";
  // A container that keeps crashing is restarted by Docker, until it's stopped
  const hasLiveContainer = (status === "running" || status === "restarting") && !isBuilding && !isPulling;
  const isStartBusy = pendingAction === "start" || isPulling || isBuilding;
  const isDisabled = isPending || isPulling || isBuilding;

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
      {hasLiveContainer ? (
        <>
          <Button
            size="xs"
            variant="outline"
            disabled={isDisabled}
            onClick={() => run("stop")}
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
            disabled={isDisabled}
            onClick={() => run("restart")}
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
          disabled={isDisabled}
          onClick={() => run("start")}
          className="gap-1.5"
        >
          <FontAwesomeIcon
            icon={isStartBusy ? faSpinner : faPlay}
            className={isStartBusy ? `size-3 animate-spin ${startIconColor}` : "size-3 text-emerald-400"}
          />
          <span>{startButtonLabel}</span>
        </Button>
      )}
      {type !== "system" && (
        <Button
          size="xs"
          variant="primary"
          disabled={isDisabled}
          onClick={() => run(type === "github" ? "rebuild" : "redeploy")}
          className="gap-1.5"
        >
          <FontAwesomeIcon icon={type === "github" ? faHammer : faCloudArrowDown} className="size-3" />
          <span>{t(type === "github" ? "rebuild" : "redeploy")}</span>
        </Button>
      )}
    </div>
  );
};

export default ServiceActions;
