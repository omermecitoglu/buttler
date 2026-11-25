import { getTranslations } from "next-intl/server";
import type { CloudflareZone } from "~/core/cloudflare/zones";

export type CloudflareZonesProps = {
  /** Null if they couldn't be loaded */
  zones: CloudflareZone[] | null,
};

const CloudflareZones = async ({ zones }: CloudflareZonesProps) => {
  const t = await getTranslations("SettingsPage.cloudflare");
  if (!zones) return <p className="text-sm text-amber-400">{t("zonesFailed")}</p>;
  if (zones.length === 0) return <p className="text-sm text-slate-500">{t("noZones")}</p>;

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-200">{t("zones")}</h3>
      <ul className="mt-2 divide-y divide-slate-800/80">
        {zones.map(({ id, name, accountName }) => (
          <li key={id} className="flex flex-wrap items-center gap-x-3 py-2">
            <span className="min-w-0 font-mono text-sm break-all text-slate-300">{name}</span>
            <span className="ml-auto text-xs text-slate-500">{accountName}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CloudflareZones;
