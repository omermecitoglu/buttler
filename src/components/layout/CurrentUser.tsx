import Image from "next/image";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { getSession } from "~/core/session";

const CurrentUser = async () => {
  await connection();
  const [
    { user },
    t,
  ] = await Promise.all([
    getSession(),
    getTranslations("BaseLayout"),
  ]);

  if (!user) return null;

  return (
    <div className="flex h-12 items-center gap-3 px-3" title={t("signedInWithGitHub")}>
      <span className="sr-only">{t("signedInWithGitHub")}</span>
      <Image
        src={user.avatar}
        alt=""
        width={32}
        height={32}
        className="size-8 shrink-0 rounded-full bg-slate-800"
      />
      <div className="min-w-0 text-sm leading-tight">
        {user.name && <p className="truncate font-medium text-slate-100">{user.name}</p>}
        <p className={user.name ? "truncate text-xs text-slate-400" : "truncate font-medium text-slate-100"}>
          {`@${user.login}`}
        </p>
      </div>
    </div>
  );
};

export default CurrentUser;
