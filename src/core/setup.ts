import "server-only";
import db from "~/database";
import hasAdmin from "~/operations/hasAdmin";
import { getSession } from "./session";
import { isInstalled } from "./settings";
import { deleteSetupCode, ensureSetupCode, isSetupCode } from "./setup-code";

/**
 * The setup isn't complete until there is an admin. An installation that lost its GitHub App (the key file was lost)
 * needs the link too, the admin keeps the role and logs in again afterwards.
 */
export async function prepareSetup() {
  if (await hasAdmin(db) && await isInstalled()) {
    deleteSetupCode();
    return false;
  }
  ensureSetupCode();
  return true;
}

/** Whether the link of the setup was opened in this browser */
export async function isSetupSession() {
  const { setupCode } = await getSession();
  return isSetupCode(setupCode);
}
