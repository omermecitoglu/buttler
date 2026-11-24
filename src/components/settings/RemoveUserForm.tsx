"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import Button from "~/components/ui/button";
import Form from "~/components/ui/form";

export type RemoveUserFormProps = {
  action: (initialState: unknown, formData: FormData) => Promise<Record<string, string>>,
  login: string,
};

const RemoveUserForm = ({ action, login }: RemoveUserFormProps) => {
  const t = useTranslations("SettingsPage.users");
  const [isRemoving, setIsRemoving] = useState(false);

  const handleAction = async (state: unknown, formData: FormData) => {
    setIsRemoving(true);
    try {
      return await action(state, formData);
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <Form action={handleAction} messages={{ remove_failed: t("messages.remove_failed") }} className="gap-2">
      <Button
        type="submit"
        variant="ghost"
        size="xs"
        pending={isRemoving}
        aria-label={t("removeUser", { login })}
        className="text-slate-400 hover:text-rose-400"
      >
        {isRemoving ? t("removing") : t("remove")}
      </Button>
    </Form>
  );
};

export default RemoveUserForm;
