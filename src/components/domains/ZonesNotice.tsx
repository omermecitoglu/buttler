import { getTranslations } from "next-intl/server";
import type { DomainZones } from "~/data/cloudflare";
import { Link } from "~/i18n/navigation";

export type ZonesNoticeProps = {
  state: DomainZones["state"],
};

/** Shown instead of the fields if there is no zone to choose */
const ZonesNotice = async ({ state }: ZonesNoticeProps) => {
  const t = await getTranslations("Domains");
  return (
    <p className="text-sm text-amber-400">
      {t(`zones.${state}`)}
      {" "}
      <Link href="/settings" className="font-medium underline hover:text-amber-300">{t("zones.open")}</Link>
    </p>
  );
};

export default ZonesNotice;
