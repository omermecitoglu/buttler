"use client";

import { faPlus } from "@fortawesome/free-solid-svg-icons/faPlus";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import Button from "~/components/ui/button";
import Form from "~/components/ui/form";
import Input from "~/components/ui/input";
import Label from "~/components/ui/label";

export type AddDomainFormProps = {
  action: (initialState: unknown, formData: FormData) => Promise<Record<string, string>>,
  defaultPort?: number,
};

const AddDomainForm = ({ action, defaultPort }: AddDomainFormProps) => {
  const t = useTranslations("ServicePage.settings.domains");
  const idPrefix = useId();
  // Uncontrolled inputs are reset when the action fails
  const [hostname, setHostname] = useState("");
  const [port, setPort] = useState(defaultPort?.toString() ?? "");
  const [isAdding, setIsAdding] = useState(false);

  const handleAction = async (state: unknown, formData: FormData) => {
    setIsAdding(true);
    try {
      const result = await action(state, formData);
      if (Object.keys(result).length === 0) setHostname("");
      return result;
    } finally {
      setIsAdding(false);
    }
  };

  // Validation errors are in upper case
  const messages = {
    add_failed: t("messages.add_failed"),
    hostname_taken: t("messages.hostname_taken"),
    INVALID_HOSTNAME: t("messages.invalid_hostname"),
    INVALID_PORT: t("messages.invalid_port"),
  };

  return (
    <Form action={handleAction} messages={messages} className="flex w-full flex-col items-stretch gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label htmlFor={`${idPrefix}-hostname`}>{t("hostnameLabel")}</Label>
          <Input
            id={`${idPrefix}-hostname`}
            name="hostname"
            required
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder={t("hostnamePlaceholder")}
            value={hostname}
            onChange={e => setHostname(e.target.value)}
          />
        </div>
        <div className="space-y-1.5 sm:w-36">
          <Label htmlFor={`${idPrefix}-port`}>{t("portLabel")}</Label>
          <Input
            id={`${idPrefix}-port`}
            name="port"
            type="number"
            min={1}
            max={65535}
            required
            placeholder={t("portPlaceholder")}
            value={port}
            onChange={e => setPort(e.target.value)}
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

export default AddDomainForm;
