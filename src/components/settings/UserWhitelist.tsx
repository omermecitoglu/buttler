import Image from "next/image";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { addUserAction, removeUserAction } from "~/actions/user";
import AddUserForm from "~/components/settings/AddUserForm";
import RemoveUserModal from "~/components/settings/RemoveUserModal";
import Card from "~/components/ui/card";
import db from "~/database";
import getUsers from "~/operations/getUsers";

const UserWhitelist = async () => {
  await connection();
  const [
    users,
    t,
  ] = await Promise.all([
    getUsers(db),
    getTranslations("SettingsPage.users"),
  ]);

  return (
    <Card className="flex max-w-2xl flex-col gap-6 p-6">
      <div>
        <h2 className="text-base font-semibold text-slate-100">{t("title")}</h2>
        <p className="mt-1 text-xs text-slate-400">{t("description")}</p>
      </div>
      <AddUserForm action={addUserAction} />
      <ul className="divide-y divide-slate-800/80">
        {users.map(user => (
          <li key={user.id} className="flex min-h-14 items-center gap-3 py-2">
            <Image
              src={user.avatar}
              alt=""
              width={32}
              height={32}
              className="size-8 shrink-0 rounded-full bg-slate-800"
            />
            <span className="min-w-0 truncate text-sm font-medium text-slate-100">{`@${user.login}`}</span>
            <div className="ml-auto shrink-0">
              {user.role === "admin" ? (
                <span className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-xs text-slate-300">
                  {t("admin")}
                </span>
              ) : (
                <RemoveUserModal action={removeUserAction.bind(null, user.id)} login={user.login} />
              )}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
};

export default UserWhitelist;
