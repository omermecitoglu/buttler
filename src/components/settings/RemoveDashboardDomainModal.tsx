"use client";

import { Dialog } from "@base-ui/react/dialog";
import { faTrash } from "@fortawesome/free-solid-svg-icons/faTrash";
import { faXmark } from "@fortawesome/free-solid-svg-icons/faXmark";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AnimatedPopup, DialogBackdrop, DialogTitle } from "@omer-x/tailwind-ui-kit/dialog";
import { useTranslations } from "next-intl";
import { useState } from "react";
import RemoveDashboardDomainForm, { type RemoveDashboardDomainFormProps } from "~/components/settings/RemoveDashboardDomainForm";
import Button from "~/components/ui/button";

export type RemoveDashboardDomainModalProps = Pick<RemoveDashboardDomainFormProps, "action" | "hostname">;

const RemoveDashboardDomainModal = ({ action, hostname }: RemoveDashboardDomainModalProps) => {
  const t = useTranslations("SettingsPage.domain.removal");
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      <Button
        size="xs"
        variant="outline"
        onClick={() => setOpen(true)}
        className="gap-1.5 text-slate-300 hover:border-rose-500/40 hover:text-rose-400"
      >
        <FontAwesomeIcon icon={faTrash} className="size-3 text-rose-400" />
        <span>{t("button")}</span>
      </Button>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop render={<DialogBackdrop className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs" />} />
          <Dialog.Popup
            render={(
              <AnimatedPopup
                className="z-50 mt-0 flex max-h-[90dvh] w-full max-w-[min(32rem,calc(100vw-2rem))] flex-col rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl"
              />
            )}
          >
            <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-800 px-6 py-4">
              <Dialog.Title render={<DialogTitle className="min-w-0 truncate text-base font-semibold text-slate-100" />}>
                {t("title", { hostname })}
              </Dialog.Title>
              <Button size="xs" variant="ghost" onClick={close} aria-label={t("close")} className="size-7 shrink-0 p-0">
                <FontAwesomeIcon icon={faXmark} className="size-3.5" />
              </Button>
            </div>
            <div className="overflow-y-auto p-6">
              <RemoveDashboardDomainForm action={action} hostname={hostname} onClose={close} />
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
};

export default RemoveDashboardDomainModal;
