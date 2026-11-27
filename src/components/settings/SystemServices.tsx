import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { setShowSystemServicesAction } from "~/actions/system-services";
import SystemServicesForm from "~/components/settings/SystemServicesForm";
import Card from "~/components/ui/card";
import db from "~/database";
import getShowSystemServices from "~/operations/getShowSystemServices";

const SystemServices = async () => {
  await connection();
  const [
    show,
    t,
  ] = await Promise.all([
    getShowSystemServices(db),
    getTranslations("SettingsPage.systemServices"),
  ]);

  return (
    <Card className="flex max-w-2xl flex-col gap-6 p-6">
      <div>
        <h2 className="text-base font-semibold text-slate-100">{t("title")}</h2>
        <p className="mt-1 text-xs text-slate-400">{t("description")}</p>
      </div>
      <SystemServicesForm key={String(show)} action={setShowSystemServicesAction} show={show} />
    </Card>
  );
};

export default SystemServices;
