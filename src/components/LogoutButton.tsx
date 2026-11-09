"use client";

import { faRightFromBracket } from "@fortawesome/free-solid-svg-icons/faRightFromBracket";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { logout } from "~/actions/session";
import Button from "~/components/ui/button";
import type { AppLocale } from "~/i18n/routing";

export type LogoutButtonProps = {
  locale: AppLocale,
  label: string,
};

const LogoutButton = ({ locale, label }: LogoutButtonProps) => (
  <form action={() => logout(locale)} className="w-full">
    <Button
      type="submit"
      variant="ghost"
      size="sm"
      className="w-full justify-start gap-2.5 text-slate-400 hover:bg-slate-900 hover:text-rose-400"
    >
      <FontAwesomeIcon icon={faRightFromBracket} className="size-4" />
      <span>{label}</span>
    </Button>
  </form>
);

export default LogoutButton;
