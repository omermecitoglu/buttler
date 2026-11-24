import { and, eq } from "drizzle-orm";
import type database from "~/database";
import { users } from "~/database/schema/users";
import type { UserDTO } from "~/models/user";

/** Removes a user from the whitelist, the admin can't be removed */
export default async function deleteUser(db: typeof database, userId: UserDTO["id"]) {
  const deleted = await db.delete(users).where(and(eq(users.id, userId), eq(users.role, "member"))).returning();
  return deleted.length > 0;
}
