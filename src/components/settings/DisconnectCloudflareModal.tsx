"use client";

import { useTranslations } from "next-intl";
import ConfirmActionModal from "~/components/ConfirmActionModal";

export type DisconnectCloudflareModalProps = {
  action: (initialState: unknown, formData: FormData) => Promise<Record<string, string>>,
};

const DisconnectCloudflareModal = ({ action }: DisconnectCloudflareModalProps) => {
  const t = useTranslations("SettingsPage.cloudflare");

  return (
    <ConfirmActionModal
      action={action}
      messages={{ disconnect_failed: t("messages.disconnect_failed") }}
      buttonLabel={t("disconnect")}
      title={t("disconnection.title")}
      description={t("disconnection.description")}
      submitLabel={t("disconnection.submit")}
      submittingLabel={t("disconnecting")}
    />
  );
};

export default DisconnectCloudflareModal;
