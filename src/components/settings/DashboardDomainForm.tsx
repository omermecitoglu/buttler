"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import HostnameFields, { type HostnameFieldsProps } from "~/components/domains/HostnameFields";
import Button from "~/components/ui/button";
import Form from "~/components/ui/form";
import { findZone, getSubdomain, joinHostname, normalizeHostname } from "~/core/domains";

export type DashboardDomainFormProps = {
  action: (initialState: unknown, formData: FormData) => Promise<Record<string, string>>,
  zones: HostnameFieldsProps["zones"],
  currentHostname: string | null,
};

const DashboardDomainForm = ({ action, zones, currentHostname }: DashboardDomainFormProps) => {
  const t = useTranslations("SettingsPage.domain");
  const currentZone = currentHostname === null ? undefined : findZone(currentHostname, zones);
  // Uncontrolled inputs are reset when the action fails
  const currentSubdomain = currentHostname !== null && currentZone ? getSubdomain(currentHostname, currentZone.name) : "";
  const [subdomain, setSubdomain] = useState(currentSubdomain);
  const [zoneId, setZoneId] = useState((currentZone ?? zones[0]).id);
  const [isSaving, setIsSaving] = useState(false);

  const handleAction = async (state: unknown, formData: FormData) => {
    formData.set("zoneId", zoneId);
    setIsSaving(true);
    try {
      return await action(state, formData);
    } finally {
      setIsSaving(false);
    }
  };

  const messages = {
    hostname_taken: t("messages.hostname_taken"),
    reload_failed: t("messages.reload_failed"),
    invalid_hostname: t("messages.invalid_hostname"),
    zone_unavailable: t("messages.zone_unavailable"),
  };

  const zone = zones.find(({ id }) => id === zoneId);
  const hostname = zone && joinHostname(normalizeHostname(subdomain), zone.name);

  return (
    <Form action={handleAction} messages={messages} className="flex w-full flex-col items-stretch gap-4">
      <HostnameFields
        zones={zones}
        subdomain={subdomain}
        onSubdomainChange={setSubdomain}
        zoneId={zoneId}
        onZoneChange={setZoneId}
      />
      <div>
        <Button type="submit" variant="primary" size="md" pending={isSaving} disabled={hostname === currentHostname}>
          {isSaving ? t("saving") : t("save")}
        </Button>
      </div>
    </Form>
  );
};

export default DashboardDomainForm;
