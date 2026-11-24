"use client";

import { Dialog } from "@base-ui/react/dialog";
import { faPen } from "@fortawesome/free-solid-svg-icons/faPen";
import { faXmark } from "@fortawesome/free-solid-svg-icons/faXmark";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AnimatedPopup, DialogBackdrop, DialogTitle } from "@omer-x/tailwind-ui-kit/dialog";
import { useTranslations } from "next-intl";
import { useState } from "react";
import EditServiceForm, { type EditServiceFormProps } from "~/components/services/EditServiceForm";
import Button from "~/components/ui/button";

export type EditServiceModalProps = Pick<EditServiceFormProps, "action" | "service">;

const EditServiceModal = ({ action, service }: EditServiceModalProps) => {
  const t = useTranslations("ServicePage.edit");
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)} className="gap-2">
        <FontAwesomeIcon icon={faPen} className="size-3 text-slate-400" />
        <span>{t("button")}</span>
      </Button>
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop render={<DialogBackdrop className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs" />} />
          <Dialog.Popup
            render={(
              <AnimatedPopup className="z-50 mt-0 flex max-h-[90dvh] w-full max-w-3xl flex-col rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl" />
            )}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-slate-800 px-6 py-4">
              <Dialog.Title render={<DialogTitle className="text-base font-semibold text-slate-100" />}>
                {t("title")}
              </Dialog.Title>
              <Button size="xs" variant="ghost" onClick={close} aria-label={t("close")} className="size-7 p-0">
                <FontAwesomeIcon icon={faXmark} className="size-3.5" />
              </Button>
            </div>
            <div className="overflow-y-auto p-6">
              <EditServiceForm action={action} service={service} onClose={close} />
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
};

export default EditServiceModal;
