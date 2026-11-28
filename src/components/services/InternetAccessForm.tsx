"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import InternetAccessChoice from "~/components/services/InternetAccessChoice";
import RecreateSubmit, { getRecreateHelpKey } from "~/components/services/RecreateSubmit";
import Form from "~/components/ui/form";

export type InternetAccessFormProps = {
  action: (initialState: unknown, formData: FormData) => Promise<Record<string, string>>,
  hasInternetAccess: boolean,
  /** Without a container, the change applies when the service is started */
  hasContainer: boolean,
  /** A build or a pull replaces the container anyway */
  isBusy: boolean,
};

const InternetAccessForm = ({ action, hasInternetAccess, hasContainer, isBusy }: InternetAccessFormProps) => {
  const t = useTranslations("ServicePage.settings.internetAccess");
  const tRecreate = useTranslations("Recreate");
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
      <RecreateSubmit
        options={canRecreate ? [{
          name: "recreate",
          label: tRecreate("container"),
          checked: recreate,
          onChange: setRecreate,
        }] : []}
        help={tRecreate(`help.${getRecreateHelpKey(hasContainer, isBusy, recreate)}`)}
        submitLabel={isSaving ? t("saving") : t("save")}
        isSaving={isSaving}
      />
    </Form>
  );
};

export default InternetAccessForm;
