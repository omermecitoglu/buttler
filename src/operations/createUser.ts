import type database from "~/database";
import { users } from "~/database/schema/users";
import type { NewUserDTO } from "~/models/user";

/** Adds a user to the whitelist, returns false if they already have access */
export default async function createUser(db: typeof database, user: NewUserDTO) {
  const created = await db.insert(users).values({ ...user, role: "member" }).onConflictDoNothing().returning();
  return created.length > 0;
}
