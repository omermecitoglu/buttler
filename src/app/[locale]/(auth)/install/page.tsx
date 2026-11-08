import { getPublicOrigin } from "@omer-x/next-utils";
import { getTranslations } from "next-intl/server";
import { installApp } from "~/actions/install";
import ManifestForm from "~/components/ManifestForm";
import Button from "~/components/ui/button";
import Card from "~/components/ui/card";
import Input from "~/components/ui/input";
import Label from "~/components/ui/label";

export default async function(_page: PageProps<"/[locale]/install">) {
  const [publicOrigin, t] = await Promise.all([
    getPublicOrigin(),
    getTranslations("InstallPage"),
  ]);

  return (
    <Card className="max-w-md">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">{t("title")}</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          {t("description")}
        </p>
      </div>
      <ManifestForm
        publicOrigin={publicOrigin}
        labels={{
          appNameLabel: t("manifest.appNameLabel"),
          organizationLabel: t("manifest.organizationLabel"),
          organizationPlaceholder: t("manifest.organizationPlaceholder"),
          organizationHelp: t("manifest.organizationHelp"),
          submit: t("manifest.submit"),
        }}
      />
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-800" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-slate-900 px-2 font-medium text-slate-500">{t("orManual")}</span>
        </div>
      </div>
      <form action={installApp} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="clientId">{t("manual.clientIdLabel")}</Label>
          <Input
            id="clientId"
            name="clientId"
            type="text"
            placeholder={t("manual.clientIdPlaceholder")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="clientSecret">{t("manual.clientSecretLabel")}</Label>
          <Input
            id="clientSecret"
            name="clientSecret"
            type="password"
            placeholder={t("manual.clientSecretPlaceholder")}
          />
        </div>
        <div className="pt-2">
          <Button type="submit" variant="secondary" size="md" className="w-full">
            {t("manual.submit")}
          </Button>
        </div>
      </form>
    </Card>
  );
}
