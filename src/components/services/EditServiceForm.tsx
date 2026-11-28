"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import EditServiceFields, { type ServiceEdit } from "~/components/services/EditServiceFields";
import RecreateSubmit, { getRecreateHelpKey } from "~/components/services/RecreateSubmit";
import Button from "~/components/ui/button";
import Form from "~/components/ui/form";

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

const EditServiceForm = ({ action, edit, onClose }: EditServiceFormProps) => {
  const t = useTranslations("ServicePage.edit");
  const tRecreate = useTranslations("Recreate");
  const [isSaving, setIsSaving] = useState(false);
  // Controlled, so it isn't reset when the action fails
  const [recreate, setRecreate] = useState(false);

  /** Tells what needs to be done to apply the changes */
  const getHelp = () => {
    if (edit.section === "name") return null;
    if ("hasContainer" in edit) return tRecreate(`help.${getRecreateHelpKey(edit.hasContainer, edit.isBusy, recreate)}`);
    if (edit.section === "source" && edit.isGitHub) return t("help.build");
    if (edit.section === "variables" && edit.isGitHub) return t("help.variables");
    return t("help.restart");
  };

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
      <RecreateSubmit
        options={canRecreate(edit) ? [{
          name: "recreate",
          label: tRecreate("container"),
          checked: recreate,
          onChange: setRecreate,
        }] : []}
        help={getHelp()}
        submitLabel={isSaving ? t("saving") : t("save")}
        isSaving={isSaving}
      >
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>{t("cancel")}</Button>
      </RecreateSubmit>
    </Form>
  );
};

export default EditServiceForm;
