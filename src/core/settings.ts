import "server-only";
import { inArray } from "drizzle-orm";
import db from "~/database";
import { settings } from "~/database/schema/settings";
import { decryptSecret, encryptSecret, isEncryptedSecret } from "./secrets";

/** The credentials of the GitHub App, they can be entered again if the key file is lost */
const GITHUB_APP_SECRETS = ["github_private_key", "github_client_secret", "github_webhook_secret"];

/** Encrypted with the key file, so a copy of the database isn't enough to get in */
const ENCRYPTED_SETTINGS = new Set([...GITHUB_APP_SECRETS, "session_password"]);

/** A value can't be moved to another setting */
function getContext(key: string) {
  return `setting:${key}`;
}

async function readSetting(key: string) {
  const record = await db.query.settings.findFirst({
    where: { key },
  });
  return record?.value ?? null;
}

/** Whether a setting is there, but can't be decrypted, e.g. because the key file was lost */
function isUnreadable(key: string, value: string | null) {
  if (value === null || !isEncryptedSecret(value)) return false;
  try {
    decryptSecret(value, getContext(key));
    return false;
  } catch {
    return true;
  }
}

/** A secret that can't be decrypted is missing */
export async function getSetting(key: string): Promise<string | null> {
  const value = await readSetting(key);
  // The values of older versions are plain until the next start
  if (value === null || !ENCRYPTED_SETTINGS.has(key) || !isEncryptedSecret(value)) return value;
  try {
    return decryptSecret(value, getContext(key));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Failed to decrypt the setting ${key}:`, error);
    return null;
  }
}

export async function setSetting(key: string, value: string): Promise<void> {
  const stored = ENCRYPTED_SETTINGS.has(key) ? encryptSecret(value, getContext(key)) : value;
  await db
    .insert(settings)
    .values({ key, value: stored })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value: stored },
    });
}

export async function isInstalled(): Promise<boolean> {
  const installed = await getSetting("installed");
  return installed === "true";
}

/**
 * Runs at startup. Encrypts the secrets that older versions stored in plain text. If the credentials of the GitHub App
 * can't be decrypted, they are removed and the setup goes back to the GitHub App, so they can be entered again.
 * A session password that can't be decrypted is replaced on its first use, everyone has to log in again.
 */
export async function secureStoredSettings() {
  const records = await db.query.settings.findMany({
    where: { key: { in: [...ENCRYPTED_SETTINGS] } },
  });
  for (const { key, value } of records) {
    if (!isEncryptedSecret(value)) await setSetting(key, value);
  }
  if (records.some(({ key, value }) => GITHUB_APP_SECRETS.includes(key) && isUnreadable(key, value))) {
    // eslint-disable-next-line no-console
    console.error("The credentials of the GitHub App can't be decrypted, set up the GitHub App again");
    await db.delete(settings).where(inArray(settings.key, GITHUB_APP_SECRETS));
    await setSetting("installed", "false");
  }
}
