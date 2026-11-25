"use client";

import { faPlus } from "@fortawesome/free-solid-svg-icons/faPlus";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import HostnameFields, { type HostnameFieldsProps } from "~/components/domains/HostnameFields";
import Button from "~/components/ui/button";
import Form from "~/components/ui/form";
import Input from "~/components/ui/input";
import Label from "~/components/ui/label";

export type AddDomainFormProps = {
  action: (initialState: unknown, formData: FormData) => Promise<Record<string, string>>,
  zones: HostnameFieldsProps["zones"],
  defaultPort?: number,
};

const AddDomainForm = ({ action, zones, defaultPort }: AddDomainFormProps) => {
  const t = useTranslations("ServicePage.settings.domains");
  const idPrefix = useId();
  // Uncontrolled inputs are reset when the action fails
  const [subdomain, setSubdomain] = useState("");
  const [zoneId, setZoneId] = useState(zones[0].id);
  const [port, setPort] = useState(defaultPort?.toString() ?? "");
  const [isAdding, setIsAdding] = useState(false);

  const handleAction = async (state: unknown, formData: FormData) => {
    formData.set("zoneId", zoneId);
    setIsAdding(true);
    try {
      const result = await action(state, formData);
      if (Object.keys(result).length === 0) setSubdomain("");
      return result;
    } finally {
      setIsAdding(false);
    }
  };

  // Validation errors are in upper case
  const messages = {
    add_failed: t("messages.add_failed"),
    connect_failed: t("messages.connect_failed"),
    invalid_hostname: t("messages.invalid_hostname"),
    hostname_taken: t("messages.hostname_taken"),
    reload_failed: t("messages.reload_failed"),
    zone_unavailable: t("messages.zone_unavailable"),
    INVALID_PORT: t("messages.invalid_port"),
  };

  return (
    <Form action={handleAction} messages={messages} className="flex w-full flex-col items-stretch gap-4">
      <HostnameFields
        zones={zones}
        subdomain={subdomain}
        onSubdomainChange={setSubdomain}
        zoneId={zoneId}
        onZoneChange={setZoneId}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
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
