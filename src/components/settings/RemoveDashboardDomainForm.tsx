"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import Button from "~/components/ui/button";
import Form from "~/components/ui/form";

export type RemoveDashboardDomainFormProps = {
  action: (initialState: unknown, formData: FormData) => Promise<Record<string, string>>,
  hostname: string,
  onClose: () => void,
};

const RemoveDashboardDomainForm = ({ action, hostname, onClose }: RemoveDashboardDomainFormProps) => {
  const t = useTranslations("SettingsPage.domain");
  const [isRemoving, setIsRemoving] = useState(false);

  const handleAction = async (state: unknown, formData: FormData) => {
    setIsRemoving(true);
    try {
      return await action(state, formData);
    } finally {
      setIsRemoving(false);
    }
  };

  const messages = {
    reload_failed: t("messages.reload_failed"),
    remove_failed: t("messages.remove_failed"),
  };

  return (
    <Form action={handleAction} messages={messages} className="flex w-full flex-col items-stretch gap-6">
      <p className="text-sm break-words text-slate-300">{t("removal.description", { hostname })}</p>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>{t("removal.cancel")}</Button>
        <Button type="submit" variant="danger" size="sm" pending={isRemoving}>
          {isRemoving ? t("removal.submitting") : t("removal.submit")}
        </Button>
      </div>
    </Form>
  );
};

export default RemoveDashboardDomainForm;
