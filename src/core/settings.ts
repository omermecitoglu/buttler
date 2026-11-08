import "server-only";
import db from "~/database";
import { settings } from "~/database/schema/settings";

export async function getSetting(key: string): Promise<string | null> {
  const record = await db.query.settings.findFirst({
    where: { key },
  });
  return record?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value },
    });
}

export async function isInstalled(): Promise<boolean> {
  const installed = await getSetting("installed");
  return installed === "true";
}
