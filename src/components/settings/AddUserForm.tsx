"use client";

import { faPlus } from "@fortawesome/free-solid-svg-icons/faPlus";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import Button from "~/components/ui/button";
import Form from "~/components/ui/form";
import Input from "~/components/ui/input";
import Label from "~/components/ui/label";

export type AddUserFormProps = {
  action: (initialState: unknown, formData: FormData) => Promise<Record<string, string>>,
};

const AddUserForm = ({ action }: AddUserFormProps) => {
  const t = useTranslations("SettingsPage.users");
  const id = useId();
  // Uncontrolled inputs are reset when the action fails
  const [login, setLogin] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const handleAction = async (state: unknown, formData: FormData) => {
    setIsAdding(true);
    try {
      const result = await action(state, formData);
      if (Object.keys(result).length === 0) setLogin("");
      return result;
    } finally {
      setIsAdding(false);
    }
  };

  const messages = {
    unknown_user: t("messages.unknown_user"),
    already_added: t("messages.already_added"),
    github_unreachable: t("messages.github_unreachable"),
  };

  return (
    <Form action={handleAction} messages={messages} className="flex w-full flex-col items-stretch gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label htmlFor={id}>{t("loginLabel")}</Label>
          <Input
            id={id}
            name="login"
            required
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder={t("loginPlaceholder")}
            value={login}
            onChange={e => setLogin(e.target.value)}
          />
        </div>
        <Button type="submit" variant="primary" size="md" pending={isAdding} className="gap-2">
          {!isAdding && <FontAwesomeIcon icon={faPlus} className="size-3" />}
          <span>{isAdding ? t("adding") : t("add")}</span>
        </Button>
      </div>
    </Form>
  );
};

export default AddUserForm;
