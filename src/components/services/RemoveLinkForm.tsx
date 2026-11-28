"use client";

import { Toast } from "@base-ui/react/toast";
import { useTranslations } from "next-intl";
import { useState } from "react";
import RecreateSubmit from "~/components/services/RecreateSubmit";
import Form from "~/components/ui/form";

export type RemoveLinkFormProps = {
  action: (initialState: unknown, formData: FormData) => Promise<Record<string, string>>,
  /** Name of the service on the other side */
  name: string,
  /** The running services that inherit variables through the link, which keep them until they are recreated */
  inheritors: string[],
};

const RemoveLinkForm = ({ action, name, inheritors }: RemoveLinkFormProps) => {
  const t = useTranslations("ServicePage.links");
  const toastManager = Toast.useToastManager();
  const [isRemoving, setIsRemoving] = useState(false);
  const [recreate, setRecreate] = useState(false);

  const handleAction = async (state: unknown, formData: FormData) => {
    setIsRemoving(true);
    try {
      const result = await action(state, formData);
      // The link is gone with this form, so the message can't be shown in it
      if (result["[error]"] === "recreate_failed") {
        toastManager.add({ description: t("messages.recreate_failed"), type: "error", priority: "high" });
      }
      return result;
    } finally {
      setIsRemoving(false);
    }
  };

  const messages = {
    disconnect_failed: t("messages.disconnect_failed"),
    remove_failed: t("messages.remove_failed"),
  };

  return (
    <Form action={handleAction} messages={messages} className="gap-2">
      <RecreateSubmit
        options={inheritors.length > 0 ? [{
          name: "recreate",
          label: t("recreateInheritors", { names: inheritors.join(", ") }),
          checked: recreate,
          onChange: setRecreate,
        }] : []}
        submitLabel={isRemoving ? t("removing") : t("remove")}
        submitProps={{
          "variant": "ghost",
          "size": "xs",
          "className": "text-slate-400 hover:text-rose-400",
          "aria-label": t("removeLink", { name }),
        }}
        isSaving={isRemoving}
      />
    </Form>
  );
};

export default RemoveLinkForm;
