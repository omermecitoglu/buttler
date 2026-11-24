"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import Button from "~/components/ui/button";
import Form from "~/components/ui/form";
import Label from "~/components/ui/label";

export type DeletableVolume = {
  name: string,
  isShared: boolean,
};

export type DeleteServiceFormProps = {
  action: (initialState: unknown, formData: FormData) => Promise<Record<string, string>>,
  volumes: DeletableVolume[],
  onClose: () => void,
};

const DeleteServiceForm = ({ action, volumes, onClose }: DeleteServiceFormProps) => {
  const t = useTranslations("ServicePage.delete");
  const checkboxId = useId();
  const [isDeleting, setIsDeleting] = useState(false);
  const hasDeletableVolume = volumes.some(volume => !volume.isShared);

  const handleAction = async (state: unknown, formData: FormData) => {
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
        <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-950/50 p-4">
          <h3 className="text-sm font-semibold text-slate-200">{t("volumes")}</h3>
          <ul className="space-y-1">
            {volumes.map(volume => (
              <li key={volume.name} className="flex flex-wrap items-baseline gap-x-2 text-xs">
                <span className="font-mono break-all text-slate-300">{volume.name}</span>
                {volume.isShared && <span className="text-slate-500">{t("sharedVolume")}</span>}
              </li>
            ))}
          </ul>
          {hasDeletableVolume && (
            <div className="space-y-1.5 border-t border-slate-800 pt-3">
              <div className="flex items-center gap-2">
                <input
                  id={checkboxId}
                  name="deleteVolumes"
                  type="checkbox"
                  disabled={isDeleting}
                  className="size-4 rounded border-slate-700 bg-slate-900 accent-rose-500"
                />
                <Label htmlFor={checkboxId}>{t("deleteVolumes")}</Label>
              </div>
              <p className="text-xs text-slate-500">{t("deleteVolumesHelp")}</p>
            </div>
          )}
        </div>
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
