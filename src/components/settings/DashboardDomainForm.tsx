"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import Button from "~/components/ui/button";
import Form from "~/components/ui/form";
import Input from "~/components/ui/input";
import Label from "~/components/ui/label";

export type DashboardDomainFormProps = {
  action: (initialState: unknown, formData: FormData) => Promise<Record<string, string>>,
  currentHostname: string | null,
};

const DashboardDomainForm = ({ action, currentHostname }: DashboardDomainFormProps) => {
  const t = useTranslations("SettingsPage.domain");
  const id = useId();
  // Uncontrolled inputs are reset when the action fails
  const [hostname, setHostname] = useState(currentHostname ?? "");
  const [isSaving, setIsSaving] = useState(false);

  const handleAction = async (state: unknown, formData: FormData) => {
    setIsSaving(true);
    try {
      return await action(state, formData);
    } finally {
      setIsSaving(false);
    }
  };

  // Validation errors are in upper case
  const messages = {
    hostname_taken: t("messages.hostname_taken"),
    reload_failed: t("messages.reload_failed"),
    INVALID_HOSTNAME: t("messages.invalid_hostname"),
  };

  return (
    <Form action={handleAction} messages={messages} className="flex w-full flex-col items-stretch gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label htmlFor={id}>{t("label")}</Label>
          <Input
            id={id}
            name="hostname"
            required
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder={t("placeholder")}
            value={hostname}
            onChange={e => setHostname(e.target.value)}
          />
        </div>
        <Button
          type="submit"
          variant="primary"
          size="md"
          pending={isSaving}
          disabled={hostname.trim().toLowerCase() === (currentHostname ?? "")}
        >
          {isSaving ? t("saving") : t("save")}
        </Button>
      </div>
    </Form>
  );
};

export default DashboardDomainForm;
