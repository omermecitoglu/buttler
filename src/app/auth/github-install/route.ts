import { redirect } from "next/navigation";
import { setSetting } from "~/core/settings";

type ManifestConversionResponse = {
  id: number,
  client_id: string,
  client_secret: string,
  pem?: string,
  webhook_secret?: string,
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return redirect("/install?error=missing_code");
  }

  try {
    const res = await fetch(`https://api.github.com/app-manifests/${code}/conversions`, {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
      },
    });

    if (!res.ok) {
      return redirect("/install?error=manifest_conversion_failed");
    }

    const data = await res.json() as ManifestConversionResponse;

    await Promise.all([
      setSetting("github_app_id", String(data.id)),
      setSetting("github_client_id", data.client_id),
      setSetting("github_client_secret", data.client_secret),
      ...(data.pem ? [setSetting("github_private_key", data.pem)] : []),
      ...(data.webhook_secret ? [setSetting("github_webhook_secret", data.webhook_secret)] : []),
      setSetting("installed", "true"),
    ]);

    return redirect("/login");
  } catch (error) {
    if (typeof error === "object" && error && "message" in error && error.message === "NEXT_REDIRECT") {
      throw error;
    }
    return redirect("/install?error=manifest_conversion_failed");
  }
}
