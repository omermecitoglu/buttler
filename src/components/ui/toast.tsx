"use client";

import { Toast } from "@base-ui/react/toast";
import { faCircleCheck } from "@fortawesome/free-solid-svg-icons/faCircleCheck";
import { faCircleExclamation } from "@fortawesome/free-solid-svg-icons/faCircleExclamation";
import { faSpinner } from "@fortawesome/free-solid-svg-icons/faSpinner";
import { faXmark } from "@fortawesome/free-solid-svg-icons/faXmark";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { cn } from "@omer-x/tailwind-ui-kit/utils";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

function getIcon(type?: string) {
  switch (type) {
    case "loading":
      return { icon: faSpinner, className: "animate-spin text-slate-400" };
    case "error":
      return { icon: faCircleExclamation, className: "text-rose-400" };
    default:
      return { icon: faCircleCheck, className: "text-emerald-400" };
  }
}

const ToastList = () => {
  const t = useTranslations("BaseLayout");
  const { toasts } = Toast.useToastManager();

  return toasts.map(toast => {
    const { icon, className } = getIcon(toast.type);
    return (
      <Toast.Root
        key={toast.id}
        toast={toast}
        className={cn(
          "rounded-xl border border-slate-700 bg-slate-900 shadow-2xl transition duration-200",
          "data-starting-style:translate-y-2 data-starting-style:opacity-0",
          "data-ending-style:translate-y-2 data-ending-style:opacity-0 data-limited:hidden",
        )}
      >
        <Toast.Content className="flex items-center gap-3 px-4 py-3">
          <FontAwesomeIcon icon={icon} className={cn("size-4 shrink-0", className)} />
          <Toast.Description className="min-w-0 flex-1 text-sm text-slate-200" />
          <Toast.Close
            aria-label={t("dismissNotification")}
            className="rounded p-1 text-slate-500 hover:text-slate-200 focus-visible:outline-2 focus-visible:outline-slate-400"
          >
            <FontAwesomeIcon icon={faXmark} className="size-3" />
          </Toast.Close>
        </Toast.Content>
      </Toast.Root>
    );
  });
};

export type ToastProviderProps = {
  children: ReactNode,
};

const ToastProvider = ({ children }: ToastProviderProps) => (
  <Toast.Provider>
    {children}
    <Toast.Portal>
      <Toast.Viewport className="fixed right-4 bottom-4 z-60 flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-2">
        <ToastList />
      </Toast.Viewport>
    </Toast.Portal>
  </Toast.Provider>
);

export default ToastProvider;
