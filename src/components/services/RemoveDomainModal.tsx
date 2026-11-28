"use client";

import { useTranslations } from "next-intl";
import ConfirmActionModal from "~/components/ConfirmActionModal";

export type RemoveDomainModalProps = {
  action: (initialState: unknown, formData: FormData) => Promise<Record<string, string>>,
  hostname: string,
};

const RemoveDomainModal = ({ action, hostname }: RemoveDomainModalProps) => {
  const t = useTranslations("ServicePage.settings.domains");

  return (
    <ConfirmActionModal
      action={action}
      messages={{
        reload_failed: t("messages.reload_failed"),
        remove_failed: t("messages.remove_failed"),
      }}
      buttonLabel={t("remove")}
      buttonAriaLabel={t("removeDomain", { hostname })}
      title={t("removal.title", { hostname })}
      description={t("removal.description", { hostname })}
      submitLabel={t("removal.submit")}
      submittingLabel={t("removing")}
    />
  );
};

export default RemoveDomainModal;
