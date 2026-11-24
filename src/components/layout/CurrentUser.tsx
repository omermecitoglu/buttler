import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "~/core/auth";

const CurrentUser = async () => {
  const [
    currentUser,
    t,
  ] = await Promise.all([
    getCurrentUser(),
    getTranslations("BaseLayout"),
  ]);

  const user = currentUser?.profile;
  if (!user) return null;

  return (
    <div className="flex h-10 min-w-0 items-center gap-3 pl-2" title={t("signedInWithGitHub")}>
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
