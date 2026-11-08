"use server";
import { getSession } from "~/core/session";
import { redirect } from "~/i18n/navigation";
import type { AppLocale } from "~/i18n/routing";

export async function logout(locale: AppLocale) {
  const session = await getSession();
  session.destroy();
  return redirect({ locale, href: "/login" });
}
