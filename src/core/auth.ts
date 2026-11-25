import "server-only";
import { forbidden, unauthorized } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { getAccess } from "./access";
import { getSession } from "./session";
import { isInstalled } from "./settings";
import { isSetupSession } from "./setup";

/** The access is read from the database on every request, so it ends before the session does */
const getVisitor = cache(async () => {
  // Sessions depend on the current time, and their password may be created in the database
  await connection();
  const { userId, user } = await getSession();
  return {
    id: userId,
    role: await getAccess(userId),
    /** Missing in the sessions that were created before it was introduced */
    profile: user ?? null,
  };
});

/** Returns null if there is no session, or if its user doesn't have access */
export async function getCurrentUser() {
  const { id, role, profile } = await getVisitor();
  if (id === undefined || !role) return null;
  return { id, role, profile };
}

/** Rejects the request with 401 if there is no session, and with 403 if its user doesn't have access */
export async function requireUser() {
  const { id, role, profile } = await getVisitor();
  if (id === undefined) unauthorized();
  if (!role) forbidden();
  return { id, role, profile };
}

/** Same as `requireUser`, but also rejects the users who are not the admin with 403 */
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") forbidden();
  return user;
}

/** Whoever opened the setup link isn't a user yet */
async function isSetup() {
  return await isSetupSession() && !await isInstalled();
}

/** Rejects the installation with 403 if the instance is already installed, or the setup link wasn't opened */
export async function requireSetup() {
  if (!await isSetup()) forbidden();
}

/** For what is done during the installation, and by the admin afterwards */
export async function requireSetupOrAdmin() {
  if (!await isSetup()) await requireAdmin();
}
