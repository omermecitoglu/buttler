export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    process.title = "buttler";
    const { default: migrate } = await import("./database/migrate");
    migrate();

    // Before the setup, which goes back to the GitHub App if its credentials can't be decrypted
    const { secureStoredSettings } = await import("./core/settings");
    await secureStoredSettings();

    const { prepareSetup } = await import("./core/setup");
    // The CLI prints the link in production
    if (await prepareSetup() && process.env.NODE_ENV === "development") {
      const { getSetupLink } = await import("./core/setup-code");
      // eslint-disable-next-line no-console
      console.log(`Set up Buttler at ${getSetupLink()}`);
    }

    const { provisionReverseProxy } = await import("./core/nginx");
    await provisionReverseProxy().catch(error => {
      // eslint-disable-next-line no-console
      console.error("Failed to provision reverse proxy service at startup:", error);
    });

    // Connects the containers again and removes the networks of links that are gone
    const { syncLinkNetworks } = await import("./core/docker/links");
    await syncLinkNetworks().catch((error: unknown) => {
      // eslint-disable-next-line no-console
      console.error("Failed to sync the link networks at startup:", error);
    });

    const { provisionTunnel } = await import("./core/cloudflare/tunnel");
    await provisionTunnel().catch((error: unknown) => {
      // eslint-disable-next-line no-console
      console.error("Failed to provision the Cloudflare tunnel at startup:", error);
    });

    // Buttler must start even if Cloudflare can't be reached, so it's not waited for
    const { syncDomains } = await import("./core/cloudflare/domains");
    void syncDomains({ verify: true });
  }
}
