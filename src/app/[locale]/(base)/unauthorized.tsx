import { getTranslations } from "next-intl/server";
import AccessMessage from "~/components/auth/AccessMessage";

export default async function() {
  const t = await getTranslations("AccessPage");

  return (
    <AccessMessage
      title={t("unauthorized.title")}
      description={t("unauthorized.description")}
      href="/login"
      linkLabel={t("unauthorized.link")}
    />
  );
}
