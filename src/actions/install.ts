"use server";
import { redirect } from "next/navigation";
import { setSetting } from "~/core/settings";

export async function installApp(formData: FormData) {
  const clientId = formData.get("clientId")?.toString().trim();
  const clientSecret = formData.get("clientSecret")?.toString().trim();

  if (clientId) {
    await setSetting("github_client_id", clientId);
  }
  if (clientSecret) {
    await setSetting("github_client_secret", clientSecret);
  }

  await setSetting("installed", "true");

  redirect("/login");
}
