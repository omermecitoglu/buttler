import type database from "~/database";
import type { UserDTO } from "~/models/user";

export default async function getUser(db: typeof database, userId: UserDTO["id"]) {
  const user = await db.query.users.findFirst({
    where: { id: userId },
  });
  return user ?? null;
}
