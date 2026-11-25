import "server-only";
import db from "~/database";
import hasAdmin from "~/operations/hasAdmin";
import { getSession } from "./session";
import { deleteSetupCode, ensureSetupCode, isSetupCode } from "./setup-code";

/** The setup isn't complete until there is an admin */
export async function prepareSetup() {
  if (await hasAdmin(db)) {
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
