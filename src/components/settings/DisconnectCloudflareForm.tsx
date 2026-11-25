"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import Button from "~/components/ui/button";
import Form from "~/components/ui/form";

export type DisconnectCloudflareFormProps = {
  action: (initialState: unknown, formData: FormData) => Promise<Record<string, string>>,
};

const DisconnectCloudflareForm = ({ action }: DisconnectCloudflareFormProps) => {
  const t = useTranslations("SettingsPage.cloudflare");
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const handleAction = async (state: unknown, formData: FormData) => {
    setIsDisconnecting(true);
    try {
      return await action(state, formData);
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <Form action={handleAction} messages={{ disconnect_failed: t("messages.disconnect_failed") }} className="gap-2">
      <Button
        type="submit"
        variant="ghost"
        size="xs"
        pending={isDisconnecting}
        className="text-slate-400 hover:text-rose-400"
      >
        {isDisconnecting ? t("disconnecting") : t("disconnect")}
      </Button>
    </Form>
  );
};

export default DisconnectCloudflareForm;
