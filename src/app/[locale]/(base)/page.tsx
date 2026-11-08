import { faHandPeace } from "@fortawesome/free-solid-svg-icons/faHandPeace";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { getTranslations } from "next-intl/server";

export default async function(_page: PageProps<"/[locale]">) {
  const t = await getTranslations("HomePage");

  return (
    <h1>
      {t("title")}
      {" "}
      <FontAwesomeIcon icon={faHandPeace} />
    </h1>
  );
}
