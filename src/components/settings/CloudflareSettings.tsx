import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { connectCloudflareAction, disconnectCloudflareAction } from "~/actions/cloudflare";
import CloudflareError from "~/components/settings/CloudflareError";
import CloudflareTunnel from "~/components/settings/CloudflareTunnel";
import CloudflareZones from "~/components/settings/CloudflareZones";
import ConnectCloudflareForm from "~/components/settings/ConnectCloudflareForm";
import DisconnectCloudflareModal from "~/components/settings/DisconnectCloudflareModal";
import LeftoverDomains from "~/components/settings/LeftoverDomains";
import Card from "~/components/ui/card";
import { getConnectionState } from "~/core/cloudflare/connection";
import { loadZones } from "~/data/cloudflare";

export type CloudflareSettingsProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>,
};

const CloudflareSettings = async ({ searchParams }: CloudflareSettingsProps) => {
  await connection();
  const [
    { cloudflare: error },
    t,
  ] = await Promise.all([
    searchParams,
    getTranslations("SettingsPage.cloudflare"),
  ]);
  const zones = await getConnectionState() === "connected" ? await loadZones() : null;
  // Loading the zones may show that the connection is lost
  const state = await getConnectionState();

  return (
    <Card className="flex max-w-2xl flex-col gap-6 p-6">
      <div className="flex items-start gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-100">{t("title")}</h2>
          <p className="mt-1 text-xs text-slate-400">{t("description")}</p>
        </div>
        {state === "connected" && (
          <span className="ml-auto shrink-0 rounded border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-xs text-emerald-400">
            {t("connected")}
          </span>
        )}
      </div>
      {state !== "connected" && <CloudflareError error={error} />}
      {state === "lost" && (
        <p className="rounded-md border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">{t("lost")}</p>
      )}
      {state === "connected" ? (
        <>
          <CloudflareZones zones={zones} />
          <CloudflareTunnel zones={zones} />
        </>
      ) : (
        <div className="space-y-4">
          <div className="space-y-1 text-xs text-slate-400">
            <p>{t("access")}</p>
            <p>{t("localhost")}</p>
          </div>
          <ConnectCloudflareForm action={connectCloudflareAction} isLost={state === "lost"} />
        </div>
      )}
      <LeftoverDomains />
      {state !== "disconnected" && (
        <div className="space-y-1">
          <DisconnectCloudflareModal action={disconnectCloudflareAction} />
          <p className="text-xs text-slate-500">{t("disconnectHelp")}</p>
        </div>
      )}
    </Card>
  );
};

export default CloudflareSettings;
