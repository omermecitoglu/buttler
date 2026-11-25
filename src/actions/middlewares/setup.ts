import "server-only";
import { requireSetupOrAdmin } from "~/core/auth";

/** For the form actions that need the setup, or the admin afterwards */
export async function setupMiddleware() {
  await requireSetupOrAdmin();
}
