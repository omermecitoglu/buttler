import "server-only";
import db from "~/database";
import type { UserDTO, UserRole } from "~/models/user";
import getUser from "~/operations/getUser";

/** Decides whether a user has access to the instance, returns null if not. Everyone is denied by default. */
export async function getAccess(userId: UserDTO["id"] | undefined): Promise<UserRole | null> {
  // Sessions may belong to users who don't have access
  if (userId === undefined) return null;
  const user = await getUser(db, userId);
  return user?.role ?? null;
}
