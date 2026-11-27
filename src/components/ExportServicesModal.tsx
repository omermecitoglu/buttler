"use client";

import { Dialog } from "@base-ui/react/dialog";
import { faFileExport } from "@fortawesome/free-solid-svg-icons/faFileExport";
import { faXmark } from "@fortawesome/free-solid-svg-icons/faXmark";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AnimatedPopup, DialogBackdrop, DialogTitle } from "@omer-x/tailwind-ui-kit/dialog";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import Button from "~/components/ui/button";
import Label from "~/components/ui/label";

export type ExportServicesModalProps = {
  services: { id: string, name: string }[],
};

const ExportServicesModal = ({ services }: ExportServicesModalProps) => {
  const t = useTranslations("DashboardPage.export");
  const idPrefix = useId();
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<string[]>([]);
  const close = () => setOpen(false);

  const openModal = () => {
    // Every service is chosen each time the list is opened
    setChosen(services.map(({ id }) => id));
    setOpen(true);
  };

  const toggle = (serviceId: string, checked: boolean) => {
    setChosen(current => (checked ? [...current, serviceId] : current.filter(id => id !== serviceId)));
  };

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        disabled={services.length === 0}
        onClick={openModal}
        className="gap-2"
      >
        <FontAwesomeIcon icon={faFileExport} className="size-3 text-slate-400" />
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
                {t("title")}
              </Dialog.Title>
              <Button size="xs" variant="ghost" onClick={close} aria-label={t("close")} className="size-7 shrink-0 p-0">
                <FontAwesomeIcon icon={faXmark} className="size-3.5" />
              </Button>
            </div>
            {/* A plain form, so the browser downloads the file */}
            <form action="/api/services/export" method="get" onSubmit={close} className="flex flex-col gap-6 overflow-y-auto p-6">
              <p className="text-sm text-slate-400">{t("description")}</p>
              <fieldset className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
                <legend className="sr-only">{t("services")}</legend>
                <ul className="space-y-2">
                  {services.map(({ id, name }) => {
                    const inputId = `${idPrefix}-${id}`;
                    return (
                      <li key={id} className="flex items-start gap-2">
                        <input
                          id={inputId}
                          type="checkbox"
                          name="id"
                          value={id}
                          checked={chosen.includes(id)}
                          onChange={event => toggle(id, event.target.checked)}
                          className="mt-0.5 size-4 shrink-0 rounded border-slate-700 bg-slate-900 accent-slate-400"
                        />
                        <Label htmlFor={inputId} className="min-w-0 font-normal tracking-normal break-all normal-case">
                          {name}
                        </Label>
                      </li>
                    );
                  })}
                </ul>
              </fieldset>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={close}>{t("cancel")}</Button>
                <Button type="submit" variant="primary" size="sm" disabled={chosen.length === 0}>
                  {t("submit")}
                </Button>
              </div>
            </form>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
};

export default ExportServicesModal;
