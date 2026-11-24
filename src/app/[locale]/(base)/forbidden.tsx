import { getTranslations } from "next-intl/server";
import AccessMessage from "~/components/auth/AccessMessage";

export default async function() {
  const t = await getTranslations("AccessPage");

  return (
    <AccessMessage
      title={t("forbidden.title")}
      description={t("forbidden.description")}
      href="/services"
      linkLabel={t("forbidden.link")}
    />
  );
}
