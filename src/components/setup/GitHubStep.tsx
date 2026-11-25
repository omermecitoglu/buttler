import { getTranslations } from "next-intl/server";
import ManifestForm from "~/components/ManifestForm";
import ManualInstallForm from "~/components/ManualInstallForm";
import ChangeDomainLink from "~/components/setup/ChangeDomainLink";
import { DASHBOARD_URL } from "~/core/setup-code";

export type GitHubStepProps = {
  origin: string,
};

const GitHubStep = async ({ origin }: GitHubStepProps) => {
  const t = await getTranslations("InstallPage");
  return (
    <>
      <div className="mb-6 space-y-2 text-sm text-slate-400">
        <p>{t("description")}</p>
        <p>{t("github.origin", { origin })}</p>
        <ChangeDomainLink />
      </div>
      <ManifestForm publicOrigin={origin} localOrigin={DASHBOARD_URL} />
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-800" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-slate-900 px-2 font-medium text-slate-500">{t("orManual")}</span>
        </div>
      </div>
      <ManualInstallForm publicOrigin={origin} />
    </>
  );
};

export default GitHubStep;
