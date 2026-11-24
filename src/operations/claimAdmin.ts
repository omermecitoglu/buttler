import type database from "~/database";
import { users } from "~/database/schema/users";
import type { NewUserDTO } from "~/models/user";

/** Makes the user the admin, unless there is one already. The unique index settles simultaneous claims. */
export default async function claimAdmin(db: typeof database, user: NewUserDTO) {
  await db.insert(users).values({ ...user, role: "admin" }).onConflictDoNothing();
}
