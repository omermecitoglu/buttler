import { getTranslations } from "next-intl/server";
import { Link } from "~/i18n/navigation";

export default async function() {
  const t = await getTranslations("ServicePage");

  return (
    <div className="flex flex-col items-center gap-2 py-16 text-center">
      <h1 className="text-xl font-semibold text-slate-100">{t("notFound.title")}</h1>
      <p className="text-sm text-slate-400">{t("notFound.description")}</p>
      <Link href="/services" className="mt-4 text-sm font-medium text-slate-300 hover:text-white">
        {t("back")}
      </Link>
    </div>
  );
}
