import { getTranslations } from "next-intl/server";
import ManifestForm from "~/components/ManifestForm";
import ManualInstallForm from "~/components/ManualInstallForm";
import Card from "~/components/ui/card";

export default async function(_page: PageProps<"/[locale]/install">) {
  const t = await getTranslations("InstallPage");

  return (
    <Card className="max-w-md">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">{t("title")}</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          {t("description")}
        </p>
      </div>
      <ManifestForm />
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-800" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-slate-900 px-2 font-medium text-slate-500">{t("orManual")}</span>
        </div>
      </div>
      <ManualInstallForm />
    </Card>
  );
}
