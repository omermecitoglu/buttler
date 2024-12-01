export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    process.title = "buttler";
    const { default: migrate } = await import("./database/migrate");
    migrate();
  }
}
