"use client";

import { useTranslations } from "next-intl";
import ConfirmActionModal from "~/components/ConfirmActionModal";

export type RemoveUserModalProps = {
  action: (initialState: unknown, formData: FormData) => Promise<Record<string, string>>,
  login: string,
};

const RemoveUserModal = ({ action, login }: RemoveUserModalProps) => {
  const t = useTranslations("SettingsPage.users");

  return (
    <ConfirmActionModal
      action={action}
      messages={{ remove_failed: t("messages.remove_failed") }}
      buttonLabel={t("remove")}
      buttonAriaLabel={t("removeUser", { login })}
      title={t("removal.title", { login })}
      description={t("removal.description", { login })}
      submitLabel={t("removal.submit")}
      submittingLabel={t("removing")}
    />
  );
};

export default RemoveUserModal;
