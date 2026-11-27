"use client";

import { Dialog } from "@base-ui/react/dialog";
import { faFileImport } from "@fortawesome/free-solid-svg-icons/faFileImport";
import { faXmark } from "@fortawesome/free-solid-svg-icons/faXmark";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AnimatedPopup, DialogBackdrop, DialogTitle } from "@omer-x/tailwind-ui-kit/dialog";
import { useTranslations } from "next-intl";
import { type ChangeEvent, useId, useState } from "react";
import type { ImportServicesResult } from "~/actions/service";
import Button from "~/components/ui/button";
import Label from "~/components/ui/label";
import { useRouter } from "~/i18n/navigation";
import type { ServiceRecipeConflict } from "~/operations/importServiceRecipe";

export type ImportServicesModalProps = {
  action: (content: string) => Promise<ImportServicesResult>,
};

const ImportServicesModal = ({ action }: ImportServicesModalProps) => {
  const t = useTranslations("DashboardPage.import");
  const router = useRouter();
  const inputId = useId();
  const [open, setOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportServicesResult | "failed" | null>(null);

  const openModal = () => {
    setResult(null);
    setOpen(true);
  };

  const close = () => {
    setOpen(false);
    if (result !== null && result !== "failed" && result.status === "imported") router.refresh();
  };

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // The same file can be chosen again after a conflict is solved
    event.target.value = "";
    if (!file) return;
    setIsImporting(true);
    setResult(null);
    try {
      setResult(await action(await file.text()));
    } catch {
      setResult("failed");
    } finally {
      setIsImporting(false);
    }
  };

  const describeConflict = (conflict: ServiceRecipeConflict) => {
    switch (conflict.type) {
      case "name":
        return t("conflicts.name", { name: conflict.name });
      case "domain":
        return conflict.owner === null
          ? t("conflicts.dashboardDomain", { hostname: conflict.hostname })
          : t("conflicts.domain", { hostname: conflict.hostname, owner: conflict.owner });
      case "port":
        return t("conflicts.port", { port: conflict.port, owner: conflict.owner });
    }
  };

  const imported = result !== null && result !== "failed" && result.status === "imported" ? result : null;
  const error = result === "failed" || result?.status === "invalid" || result?.status === "unsupported_version"
    ? t(`messages.${result === "failed" ? "failed" : result.status}`)
    : null;

  return (
    <>
      <Button variant="secondary" size="sm" onClick={openModal} className="gap-2">
        <FontAwesomeIcon icon={faFileImport} className="size-3 text-slate-400" />
        <span>{t("button")}</span>
      </Button>
      <Dialog.Root open={open} onOpenChange={next => (next ? setOpen(true) : close())}>
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
            <div className="flex flex-col gap-6 overflow-y-auto p-6">
              {imported ? (
                <div className="flex flex-col gap-4 text-sm">
                  <p className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-emerald-400">
                    {t("imported", { count: imported.deployed.length + imported.waiting.length })}
                  </p>
                  {imported.deployed.length > 0 && (
                    <div>
                      <p className="font-semibold text-slate-200">{t("deployed")}</p>
                      <ul className="mt-1 list-disc pl-5 text-slate-400">
                        {imported.deployed.map(name => <li key={name}>{name}</li>)}
                      </ul>
                    </div>
                  )}
                  {imported.waiting.length > 0 && (
                    <div>
                      <p className="font-semibold text-slate-200">{t("waiting")}</p>
                      <p className="mt-1 text-xs text-slate-500">{t("waitingHelp")}</p>
                      <ul className="mt-1 list-disc pl-5 text-slate-400">
                        {imported.waiting.map(name => <li key={name}>{name}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <p className="text-sm text-slate-400">{t("description")}</p>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor={inputId}>{t("file")}</Label>
                    <input
                      id={inputId}
                      type="file"
                      accept="application/json,.json"
                      disabled={isImporting}
                      onChange={handleFile}
                      className="text-sm text-slate-300 file:mr-3 file:rounded-md file:border-0 file:bg-slate-800 file:px-3 file:py-1.5 file:text-slate-200"
                    />
                  </div>
                  {isImporting && <p className="text-sm text-slate-400">{t("importing")}</p>}
                  {error && (
                    <p className="rounded-md border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">{error}</p>
                  )}
                  {result !== null && result !== "failed" && result.status === "conflicts" && (
                    <div className="rounded-md border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
                      <p className="font-semibold">{t("conflicts.title")}</p>
                      <ul className="mt-2 list-disc space-y-1 pl-5">
                        {result.conflicts.map(conflict => (
                          <li key={JSON.stringify(conflict)}>{describeConflict(conflict)}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
              <div className="flex justify-end">
                <Button type="button" variant="ghost" size="sm" onClick={close}>{t("done")}</Button>
              </div>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
};

export default ImportServicesModal;
