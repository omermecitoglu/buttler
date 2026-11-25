"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import Button from "~/components/ui/button";
import Form from "~/components/ui/form";
import Label from "~/components/ui/label";
import Select from "~/components/ui/select";

export type SetUpTunnelFormProps = {
  action: (initialState: unknown, formData: FormData) => Promise<Record<string, string>>,
  accounts: { id: string, name: string }[],
};

const SetUpTunnelForm = ({ action, accounts }: SetUpTunnelFormProps) => {
  const t = useTranslations("SettingsPage.cloudflare");
  const id = useId();
  const [accountId, setAccountId] = useState(accounts[0].id);
  const [isSettingUp, setIsSettingUp] = useState(false);

  const handleAction = async (state: unknown, formData: FormData) => {
    formData.set("accountId", accountId);
    setIsSettingUp(true);
    try {
      return await action(state, formData);
    } finally {
      setIsSettingUp(false);
    }
  };

  return (
    <Form action={handleAction} messages={{ setup_failed: t("messages.setup_failed") }} className="gap-3">
      {accounts.length > 1 && (
        <div className="space-y-1.5">
          <Label htmlFor={id}>{t("tunnel.account")}</Label>
          <Select id={id} value={accountId} onChange={e => setAccountId(e.target.value)}>
            {accounts.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}
          </Select>
        </div>
      )}
      <Button type="submit" variant="primary" size="md" pending={isSettingUp}>
        {isSettingUp ? t("tunnel.settingUp") : t("tunnel.setUp")}
      </Button>
    </Form>
  );
};

export default SetUpTunnelForm;
