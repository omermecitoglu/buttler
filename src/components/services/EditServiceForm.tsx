"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import EditServiceFields, { type ServiceEdit } from "~/components/services/EditServiceFields";
import Button from "~/components/ui/button";
import Form from "~/components/ui/form";
import Label from "~/components/ui/label";

export type ServiceEditAction = (initialState: unknown, formData: FormData) => Promise<Record<string, string>>;

export type EditServiceFormProps = {
  action: ServiceEditAction,
  edit: ServiceEdit,
  onClose: () => void,
};

/** Ports and storage mounts can't be changed on an existing container */
function canRecreate(edit: ServiceEdit) {
  return "hasContainer" in edit && edit.hasContainer && !edit.isBusy;
}

/** Tells what needs to be done to apply the changes */
function getHelpKey(edit: ServiceEdit, recreate: boolean) {
  if (edit.section === "name") return null;
  if ("hasContainer" in edit) {
    if (!edit.hasContainer) return "onStart";
    if (edit.isBusy) return "onDeploy";
    return recreate ? "recreateNow" : "onRestart";
  }
  if (edit.section === "source" && edit.isGitHub) return "build";
  if (edit.section === "variables" && edit.isGitHub) return "variables";
  return "restart";
}

const EditServiceForm = ({ action, edit, onClose }: EditServiceFormProps) => {
  const t = useTranslations("ServicePage.edit");
  const recreateId = useId();
  const [isSaving, setIsSaving] = useState(false);
  // Controlled, so it isn't reset when the action fails
  const [recreate, setRecreate] = useState(false);
  const helpKey = getHelpKey(edit, recreate);

  const handleAction = async (state: unknown, formData: FormData) => {
    setIsSaving(true);
    try {
      const result = await action(state, formData);
      if (Object.keys(result).length === 0) onClose();
      return result;
    } finally {
      setIsSaving(false);
    }
  };

  // Validation errors are in upper case
  const messages = {
    update_failed: t("messages.update_failed"),
    recreate_failed: t("messages.recreate_failed"),
    service_busy: t("messages.service_busy"),
    secret_value_required: t("messages.secret_value_required"),
    inherited_variable_name: t("messages.inherited_variable_name"),
    TOO_SMALL: t("messages.field_required"),
    INVALID_PORTS: t("messages.invalid_ports"),
    INVALID_ENVIRONMENT_VARIABLES: t("messages.invalid_environment_variables"),
    INVALID_VOLUMES: t("messages.invalid_volumes"),
    VOLUME_NAME_REQUIRED: t("messages.volume_name_required"),
    INVALID_VOLUME_NAME: t("messages.invalid_volume_name"),
  };

  return (
    <Form action={handleAction} messages={messages} className="flex w-full flex-col items-stretch gap-6">
      <EditServiceFields edit={edit} />
      {canRecreate(edit) && (
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
        {helpKey && <p className="text-xs text-slate-500">{t(`help.${helpKey}`)}</p>}
        <div className="ml-auto flex shrink-0 gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>{t("cancel")}</Button>
          <Button type="submit" variant="primary" size="sm" pending={isSaving}>
            {isSaving ? t("saving") : t("save")}
          </Button>
        </div>
      </div>
    </Form>
  );
};

export default EditServiceForm;
