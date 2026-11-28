"use client";

import { useTranslations } from "next-intl";
import ConfirmActionModal from "~/components/ConfirmActionModal";

export type DisconnectCloudflareModalProps = {
  action: (initialState: unknown, formData: FormData) => Promise<Record<string, string>>,
  /** Disconnecting deletes the tunnel that carries this page */
  isThroughTunnel: boolean,
};

const DisconnectCloudflareModal = ({ action, isThroughTunnel }: DisconnectCloudflareModalProps) => {
  const t = useTranslations("SettingsPage.cloudflare");
  const tSettings = useTranslations("SettingsPage");

  return (
    <ConfirmActionModal
      action={action}
      messages={{ disconnect_failed: t("messages.disconnect_failed") }}
      buttonLabel={t("disconnect")}
      title={t("disconnection.title")}
      description={t("disconnection.description")}
      submitLabel={t("disconnection.submit")}
      submittingLabel={t("disconnecting")}
      disabledReason={isThroughTunnel ? tSettings("throughTunnel") : null}
    />
  );
};

export default DisconnectCloudflareModal;
