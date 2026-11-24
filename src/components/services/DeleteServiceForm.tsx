"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import Button from "~/components/ui/button";
import Form from "~/components/ui/form";
import Label from "~/components/ui/label";
import type { ServiceVolume } from "~/data/services";

export type DeleteServiceFormProps = {
  action: (initialState: unknown, formData: FormData) => Promise<Record<string, string>>,
  volumes: ServiceVolume[],
  onClose: () => void,
};

const DeleteServiceForm = ({ action, volumes, onClose }: DeleteServiceFormProps) => {
  const t = useTranslations("ServicePage.delete");
  const idPrefix = useId();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleAction = async (state: unknown, formData: FormData) => {
    // Read from the form, because it's reset after a failure. What is submitted must be what is seen.
    formData.set("volumes", JSON.stringify(formData.getAll("chosenVolume")));
    setIsDeleting(true);
    try {
      return await action(state, formData);
    } finally {
      setIsDeleting(false);
    }
  };

  const messages = {
    delete_failed: t("messages.delete_failed"),
    service_busy: t("messages.service_busy"),
  };

  return (
    <Form action={handleAction} messages={messages} className="flex w-full flex-col items-stretch gap-6">
      <p className="text-sm text-slate-300">{t("description")}</p>
      {volumes.length > 0 && (
        <fieldset disabled={isDeleting} className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
          <legend className="sr-only">{t("volumes")}</legend>
          <p aria-hidden className="text-sm font-semibold text-slate-200">{t("volumes")}</p>
          <p className="mt-1 text-xs text-slate-500">{t("volumesHelp")}</p>
          <ul className="mt-3 space-y-2">
            {volumes.map(({ name, keptAs }, index) => {
              const id = `${idPrefix}-${index}`;
              return (
                <li key={name} className="flex items-start gap-2">
                  <input
                    id={id}
                    type="checkbox"
                    name="chosenVolume"
                    value={name}
                    disabled={keptAs !== null}
                    className="mt-0.5 size-4 shrink-0 rounded border-slate-700 bg-slate-900 accent-rose-500"
                  />
                  <Label htmlFor={id} className="min-w-0 font-mono font-normal tracking-normal break-all normal-case">
                    {name}
                    {keptAs && <span className="ml-2 font-sans text-slate-500">{t(`keptAs.${keptAs}`)}</span>}
                  </Label>
                </li>
              );
            })}
          </ul>
        </fieldset>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>{t("cancel")}</Button>
        <Button type="submit" variant="danger" size="sm" pending={isDeleting}>
          {isDeleting ? t("submitting") : t("submit")}
        </Button>
      </div>
    </Form>
  );
};

export default DeleteServiceForm;
