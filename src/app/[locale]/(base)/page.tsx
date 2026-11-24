import { faHandPeace } from "@fortawesome/free-solid-svg-icons/faHandPeace";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import Authorized from "~/components/auth/Authorized";

export default async function(_page: PageProps<"/[locale]">) {
  const t = await getTranslations("HomePage");

  return (
    <Suspense fallback={null}>
      <Authorized>
        <h1>
          {t("title")}
          {" "}
          <FontAwesomeIcon icon={faHandPeace} />
        </h1>
      </Authorized>
    </Suspense>
  );
}
