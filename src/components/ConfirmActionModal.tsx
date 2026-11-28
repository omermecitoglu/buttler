"use client";

import { Dialog } from "@base-ui/react/dialog";
import { faXmark } from "@fortawesome/free-solid-svg-icons/faXmark";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AnimatedPopup, DialogBackdrop, DialogTitle } from "@omer-x/tailwind-ui-kit/dialog";
import { useTranslations } from "next-intl";
import { type ReactNode, useState } from "react";
import RecreateSubmit from "~/components/services/RecreateSubmit";
import Button from "~/components/ui/button";
import DisabledReason from "~/components/ui/disabled-reason";
import Form from "~/components/ui/form";

export type ConfirmActionModalProps = {
  action: (initialState: unknown, formData: FormData) => Promise<Record<string, string>>,
  messages: Record<string, string>,
  /** The text of the button that opens the modal */
  buttonLabel: string,
  /** Tells which item the button is for, when the label doesn't */
  buttonAriaLabel?: string,
  title: string,
  description: ReactNode,
  submitLabel: string,
  submittingLabel: string,
  /** Checkboxes that recreate containers after the action, sent with "on" when they are checked */
  recreateOptions?: { name: string, label: string }[],
  /** Sees the result before the modal is closed, e.g. when the item is gone with it */
  onResult?: (result: Record<string, string>) => void,
  /** Disables the button, and tells why on hover */
  disabledReason?: string | null,
};

/** A button that asks for a confirmation in a modal before it runs a destructive action */
const ConfirmActionModal = ({
  action,
  messages,
  buttonLabel,
  buttonAriaLabel,
  title,
  description,
  submitLabel,
  submittingLabel,
  recreateOptions = [],
  onResult,
  disabledReason,
}: ConfirmActionModalProps) => {
  const t = useTranslations("Confirm");
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checked, setChecked] = useState<string[]>([]);
  const close = () => setOpen(false);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) setChecked([]);
  };

  const handleAction = async (state: unknown, formData: FormData) => {
    setIsSubmitting(true);
    try {
      const result = await action(state, formData);
      onResult?.(result);
      if (Object.keys(result).length === 0) close();
      return result;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <DisabledReason reason={disabledReason}>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          disabled={!!disabledReason}
          onClick={() => handleOpenChange(true)}
          aria-label={buttonAriaLabel}
          className="text-slate-400 hover:text-rose-400"
        >
          {buttonLabel}
        </Button>
      </DisabledReason>
      <Dialog.Root open={open} onOpenChange={handleOpenChange}>
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
                {title}
              </Dialog.Title>
              <Button size="xs" variant="ghost" onClick={close} aria-label={t("close")} className="size-7 shrink-0 p-0">
                <FontAwesomeIcon icon={faXmark} className="size-3.5" />
              </Button>
            </div>
            <div className="overflow-y-auto p-6">
              <Form action={handleAction} messages={messages} className="flex w-full flex-col items-stretch gap-6">
                <p className="text-sm break-words text-slate-300">{description}</p>
                <RecreateSubmit
                  options={recreateOptions.map(option => ({
                    ...option,
                    checked: checked.includes(option.name),
                    onChange: (isChecked: boolean) => setChecked(isChecked
                      ? [...checked, option.name]
                      : checked.filter(name => name !== option.name)),
                  }))}
                  submitLabel={isSubmitting ? submittingLabel : submitLabel}
                  submitProps={{ variant: "danger" }}
                  isSaving={isSubmitting}
                >
                  <Button type="button" variant="ghost" size="sm" onClick={close}>{t("cancel")}</Button>
                </RecreateSubmit>
              </Form>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
};

export default ConfirmActionModal;
