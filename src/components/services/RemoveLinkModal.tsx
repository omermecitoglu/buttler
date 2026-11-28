"use client";

import { Toast } from "@base-ui/react/toast";
import { useTranslations } from "next-intl";
import ConfirmActionModal from "~/components/ConfirmActionModal";

export type RemoveLinkModalProps = {
  action: (initialState: unknown, formData: FormData) => Promise<Record<string, string>>,
  /** Name of the service on the other side */
  name: string,
  /** The running services that inherit variables through the link, which keep them until they are recreated */
  inheritors: string[],
};

const RemoveLinkModal = ({ action, name, inheritors }: RemoveLinkModalProps) => {
  const t = useTranslations("ServicePage.links");
  const toastManager = Toast.useToastManager();

  return (
    <ConfirmActionModal
      action={action}
      messages={{
        disconnect_failed: t("messages.disconnect_failed"),
        remove_failed: t("messages.remove_failed"),
      }}
      buttonLabel={t("remove")}
      buttonAriaLabel={t("removeLink", { name })}
      title={t("removal.title", { name })}
      description={t("removal.description", { name })}
      submitLabel={t("removal.submit")}
      submittingLabel={t("removing")}
      recreateOptions={inheritors.length > 0
        ? [{ name: "recreate", label: t("recreateInheritors", { names: inheritors.join(", ") }) }]
        : []}
      onResult={result => {
        // The link is gone with this modal, so the message can't be shown in it
        if (result["[error]"] === "recreate_failed") {
          toastManager.add({ description: t("messages.recreate_failed"), type: "error", priority: "high" });
        }
      }}
    />
  );
};

export default RemoveLinkModal;
