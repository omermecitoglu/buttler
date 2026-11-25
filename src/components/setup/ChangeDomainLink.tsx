import { getTranslations } from "next-intl/server";
import { DASHBOARD_URL } from "~/core/setup-code";

/** The old domain isn't served anymore after the change, so it's only possible at localhost */
const ChangeDomainLink = async () => {
  const t = await getTranslations("InstallPage.domain");
  return (
    <a
      href={`${DASHBOARD_URL}/install?step=domain`}
      className="inline-block text-xs font-medium text-slate-200 underline hover:text-white"
    >
      {t("change")}
    </a>
  );
};

export default ChangeDomainLink;
