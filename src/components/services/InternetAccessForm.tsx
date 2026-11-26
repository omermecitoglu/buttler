"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import InternetAccessChoice from "~/components/services/InternetAccessChoice";
import Button from "~/components/ui/button";
import Form from "~/components/ui/form";
import Label from "~/components/ui/label";

export type InternetAccessFormProps = {
  action: (initialState: unknown, formData: FormData) => Promise<Record<string, string>>,
  hasInternetAccess: boolean,
  /** Without a container, the change applies when the service is started */
  hasContainer: boolean,
  /** A build or a pull replaces the container anyway */
  isBusy: boolean,
};

/** Tells when the change is applied to the container */
function getHelpKey(hasContainer: boolean, isBusy: boolean, recreate: boolean) {
  if (!hasContainer) return "onStart";
  if (isBusy) return "onDeploy";
  return recreate ? "now" : "onRestart";
}

const InternetAccessForm = ({ action, hasInternetAccess, hasContainer, isBusy }: InternetAccessFormProps) => {
  const t = useTranslations("ServicePage.settings.internetAccess");
  const recreateId = useId();
  // Controlled inputs, so they aren't reset when the action fails
  const [internetAccess, setInternetAccess] = useState(hasInternetAccess);
  const [recreate, setRecreate] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const canRecreate = hasContainer && !isBusy;

  const handleAction = async (state: unknown, formData: FormData) => {
    setIsSaving(true);
    try {
      return await action(state, formData);
    } finally {
      setIsSaving(false);
    }
  };

  const messages = {
    saved: t("messages.saved"),
    recreated: t("messages.recreated"),
    update_failed: t("messages.update_failed"),
    recreate_failed: t("messages.recreate_failed"),
    service_busy: t("messages.service_busy"),
  };

  return (
    <Form action={handleAction} messages={messages} className="flex w-full flex-col items-stretch gap-4">
      <InternetAccessChoice value={internetAccess} onChange={setInternetAccess} disabled={isSaving} />
      {canRecreate && (
        <div className="flex items-start gap-2">
          <input
            id={recreateId}
            type="checkbox"
            name="recreate"
            checked={recreate}
            onChange={event => setRecreate(event.target.checked)}
            disabled={isSaving}
            className="mt-0.5 size-4 shrink-0 rounded border-slate-700 bg-slate-900 accent-sky-500"
          />
          <Label htmlFor={recreateId} className="font-normal tracking-normal normal-case">{t("recreate")}</Label>
        </div>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <p className="text-xs text-slate-500">{t(`help.${getHelpKey(hasContainer, isBusy, recreate)}`)}</p>
        <div className="ml-auto shrink-0">
          <Button type="submit" variant="primary" size="sm" pending={isSaving}>
            {isSaving ? t("saving") : t("save")}
          </Button>
        </div>
      </div>
    </Form>
  );
};

export default InternetAccessForm;
