"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import Button from "~/components/ui/button";
import Form from "~/components/ui/form";

export type ConnectCloudflareFormProps = {
  action: (initialState: unknown, formData: FormData) => Promise<Record<string, string>>,
  isLost: boolean,
};

const ConnectCloudflareForm = ({ action, isLost }: ConnectCloudflareFormProps) => {
  const t = useTranslations("SettingsPage.cloudflare");
  const [isConnecting, setIsConnecting] = useState(false);

  const handleAction = async (state: unknown, formData: FormData) => {
    setIsConnecting(true);
    try {
      return await action(state, formData);
    } finally {
      setIsConnecting(false);
    }
  };

  const label = isLost ? t("connectAgain") : t("connect");

  return (
    <Form action={handleAction} messages={{}}>
      <Button type="submit" variant="primary" size="md" pending={isConnecting}>
        {isConnecting ? t("connecting") : label}
      </Button>
    </Form>
  );
};

export default ConnectCloudflareForm;
