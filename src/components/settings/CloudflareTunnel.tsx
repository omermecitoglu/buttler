import { getTranslations } from "next-intl/server";
import { setUpTunnelAction } from "~/actions/cloudflare";
import SetUpTunnelForm from "~/components/settings/SetUpTunnelForm";
import { getAccounts, getTunnelInfo } from "~/core/cloudflare/tunnel";
import type { CloudflareZone } from "~/core/cloudflare/zones";
import { Link } from "~/i18n/navigation";

export type CloudflareTunnelProps = {
  /** Null if they couldn't be loaded */
  zones: CloudflareZone[] | null,
};

const CloudflareTunnel = async ({ zones }: CloudflareTunnelProps) => {
  const [
    tunnel,
    t,
  ] = await Promise.all([
    getTunnelInfo(),
    getTranslations("SettingsPage.cloudflare.tunnel"),
  ]);
  const accounts = getAccounts(zones ?? []);

  if (!tunnel) {
    if (accounts.length === 0) return null;
    return (
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">{t("title")}</h3>
          <p className="mt-1 text-xs text-slate-400">{t("missing")}</p>
        </div>
        <SetUpTunnelForm action={setUpTunnelAction} accounts={accounts} />
      </div>
    );
  }

  const account = accounts.find(({ id }) => id === tunnel.accountId);

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-200">{t("title")}</h3>
      <p className="mt-1 text-xs text-slate-400">{t("running", { account: account?.name ?? tunnel.accountId })}</p>
      <Link
        href={{ pathname: "/services/[id]", params: { id: tunnel.serviceId } }}
        className="mt-2 inline-block text-xs font-medium text-slate-200 underline hover:text-white"
      >
        {t("open")}
      </Link>
    </div>
  );
};

export default CloudflareTunnel;
