"use client";

import { faRightFromBracket } from "@fortawesome/free-solid-svg-icons/faRightFromBracket";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useLocale, useTranslations } from "next-intl";
import { logout } from "~/actions/session";
import Button from "~/components/ui/button";

const LogoutButton = () => {
  const t = useTranslations("BaseLayout");
  const locale = useLocale();

  return (
    <form action={() => logout(locale)} className="ml-auto shrink-0">
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        aria-label={t("logout")}
        title={t("logout")}
        className="size-10 justify-center p-0 text-slate-400 hover:bg-slate-800/60 hover:text-rose-400"
      >
        <FontAwesomeIcon icon={faRightFromBracket} className="size-4" />
      </Button>
    </form>
  );
};

export default LogoutButton;
