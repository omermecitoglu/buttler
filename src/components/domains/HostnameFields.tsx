"use client";

import { useTranslations } from "next-intl";
import { useId } from "react";
import Input from "~/components/ui/input";
import Label from "~/components/ui/label";
import Select from "~/components/ui/select";
import { isCoveredByCertificate, joinHostname, normalizeHostname } from "~/core/domains";

export type HostnameFieldsProps = {
  zones: { id: string, name: string }[],
  subdomain: string,
  onSubdomainChange: (subdomain: string) => void,
  zoneId: string,
  onZoneChange: (zoneId: string) => void,
};

/** A zone, and an optional subdomain of it */
const HostnameFields = ({ zones, subdomain, onSubdomainChange, zoneId, onZoneChange }: HostnameFieldsProps) => {
  const t = useTranslations("Domains");
  const idPrefix = useId();
  const zone = zones.find(({ id }) => id === zoneId);
  const normalizedSubdomain = normalizeHostname(subdomain);

  return (
    <div className="space-y-1.5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label htmlFor={`${idPrefix}-subdomain`}>{t("subdomainLabel")}</Label>
          <Input
            id={`${idPrefix}-subdomain`}
            name="subdomain"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder={t("subdomainPlaceholder")}
            value={subdomain}
            onChange={e => onSubdomainChange(e.target.value)}
          />
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label htmlFor={`${idPrefix}-zone`}>{t("zoneLabel")}</Label>
          <Select id={`${idPrefix}-zone`} value={zoneId} onChange={e => onZoneChange(e.target.value)}>
            {zones.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
          </Select>
        </div>
      </div>
      {zone && (
        <p className="text-xs break-all text-slate-500">
          {t("preview", { hostname: joinHostname(normalizedSubdomain, zone.name) })}
        </p>
      )}
      {!isCoveredByCertificate(normalizedSubdomain) && (
        <p className="text-xs text-amber-400">{t("certificateWarning")}</p>
      )}
    </div>
  );
};

export default HostnameFields;
