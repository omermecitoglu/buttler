import "server-only";
import { requireAdmin } from "~/core/auth";

/** For the form actions that need the admin */
export async function adminMiddleware() {
  await requireAdmin();
}
