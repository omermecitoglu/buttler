import { getTranslations } from "next-intl/server";
import { connectCloudflareAction, setUpTunnelAction } from "~/actions/cloudflare";
import { retryDomainAction } from "~/actions/setup";
import DomainActionForm from "~/components/domains/DomainActionForm";
import CloudflareError from "~/components/settings/CloudflareError";
import ConnectCloudflareForm from "~/components/settings/ConnectCloudflareForm";
import SetUpTunnelForm from "~/components/settings/SetUpTunnelForm";
import { getConnectionState } from "~/core/cloudflare/connection";
import { getAccounts } from "~/core/cloudflare/tunnel";
import { loadZones } from "~/data/cloudflare";

export type CloudflareStepProps = {
  error: unknown,
};

/** The connection, and the tunnel if it couldn't be set up automatically */
const CloudflareStep = async ({ error }: CloudflareStepProps) => {
  const t = await getTranslations("SettingsPage.cloudflare");
  const tDomains = await getTranslations("Domains");
  const zones = await getConnectionState() === "connected" ? await loadZones() : null;
  // Loading the zones may show that the connection is lost
  const state = await getConnectionState();

  if (state !== "connected") {
    return (
      <div className="space-y-4">
        <CloudflareError error={error} />
        {state === "lost" && <p className="text-sm text-amber-400">{t("lost")}</p>}
        <div className="space-y-1 text-sm text-slate-400">
          <p>{t("description")}</p>
          <p>{t("access")}</p>
          <p>{t("localhost")}</p>
        </div>
        <ConnectCloudflareForm action={connectCloudflareAction} isLost={state === "lost"} />
      </div>
    );
  }

  if (zones && zones.length > 0) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-400">{t("tunnel.missing")}</p>
        <SetUpTunnelForm action={setUpTunnelAction} accounts={getAccounts(zones)} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-amber-400">{zones ? t("noZones") : t("zonesFailed")}</p>
      <DomainActionForm action={retryDomainAction} label={tDomains("retry")} pendingLabel={tDomains("retrying")} />
      <ConnectCloudflareForm action={connectCloudflareAction} isLost />
    </div>
  );
};

export default CloudflareStep;
