"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import InternetAccessChoice from "~/components/services/InternetAccessChoice";
import RecreateSubmit, { getRecreateHelpKey } from "~/components/services/RecreateSubmit";
import Form from "~/components/ui/form";
import type { ContainerState } from "~/utils/containerState";

export type InternetAccessFormProps = {
  action: (initialState: unknown, formData: FormData) => Promise<Record<string, string>>,
  hasInternetAccess: boolean,
  containerState: ContainerState,
};

const InternetAccessForm = ({ action, hasInternetAccess, containerState }: InternetAccessFormProps) => {
  const t = useTranslations("ServicePage.settings.internetAccess");
  const tRecreate = useTranslations("Recreate");
  // Controlled inputs, so they aren't reset when the action fails
  const [internetAccess, setInternetAccess] = useState(hasInternetAccess);
  const [recreate, setRecreate] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const canRecreate = containerState === "running";

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
      <RecreateSubmit
        options={canRecreate ? [{
          name: "recreate",
          label: tRecreate("container"),
          checked: recreate,
          onChange: setRecreate,
        }] : []}
        help={tRecreate(`help.${getRecreateHelpKey(containerState, recreate)}`)}
        submitLabel={isSaving ? t("saving") : t("save")}
        isSaving={isSaving}
      />
    </Form>
  );
};

export default InternetAccessForm;
