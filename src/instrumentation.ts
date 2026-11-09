export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    process.title = "buttler";
    const { default: migrate } = await import("./database/migrate");
    migrate();

    const { provisionReverseProxy } = await import("./core/nginx");
    await provisionReverseProxy().catch(error => {
      // eslint-disable-next-line no-console
      console.error("Failed to provision reverse proxy service at startup:", error);
    });
  }
}
