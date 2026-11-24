import { eq } from "drizzle-orm";
import type database from "~/database";
import { users } from "~/database/schema/users";
import type { NewUserDTO } from "~/models/user";

/** Keeps up with the changes of the GitHub account */
export default async function updateUser(db: typeof database, { id, login, avatar }: NewUserDTO) {
  await db.update(users).set({ login, avatar }).where(eq(users.id, id));
}
