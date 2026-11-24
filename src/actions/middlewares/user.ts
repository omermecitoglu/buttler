import "server-only";
import { requireUser } from "~/core/auth";

/** For the form actions that need a user */
export async function userMiddleware() {
  await requireUser();
}
