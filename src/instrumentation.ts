export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    process.title = "buttler";
    const { default: migrate } = await import("./database/migrate");
    migrate();

    // NOTE (v2 roadmap): Reverse proxy service startup is disabled pending Phase 4 redesign.
    // const { startReverseProxyService } = await import("./core/nginx");
    // await startReverseProxyService();
  }
}
