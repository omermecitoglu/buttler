"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import EditServiceFields, { type ServiceEdit } from "~/components/services/EditServiceFields";
import Button from "~/components/ui/button";
import Form from "~/components/ui/form";

export type ServiceEditAction = (initialState: unknown, formData: FormData) => Promise<Record<string, string>>;

export type EditServiceFormProps = {
  action: ServiceEditAction,
  edit: ServiceEdit,
  onClose: () => void,
};

/** Tells what needs to be done to apply the changes */
function getHelpKey(edit: ServiceEdit) {
  if (edit.section === "name") return null;
  if (edit.section === "source" && edit.isGitHub) return "build";
  if (edit.section === "variables" && edit.isGitHub) return "variables";
  return "restart";
}

const EditServiceForm = ({ action, edit, onClose }: EditServiceFormProps) => {
  const t = useTranslations("ServicePage.edit");
  const [isSaving, setIsSaving] = useState(false);
  const helpKey = getHelpKey(edit);

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
    secret_value_required: t("messages.secret_value_required"),
    TOO_SMALL: t("messages.field_required"),
    INVALID_PORTS: t("messages.invalid_ports"),
    INVALID_ENVIRONMENT_VARIABLES: t("messages.invalid_environment_variables"),
    INVALID_VOLUMES: t("messages.invalid_volumes"),
  };

  return (
    <Form action={handleAction} messages={messages} className="flex w-full flex-col items-stretch gap-6">
      <EditServiceFields edit={edit} />
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
