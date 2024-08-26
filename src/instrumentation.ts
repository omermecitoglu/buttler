export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const path = await import("node:path");
    const { default: Database } = await import("better-sqlite3");
    const { drizzle } = await import("drizzle-orm/better-sqlite3");
    const { migrate } = await import("drizzle-orm/better-sqlite3/migrator");

    const sqlite = new Database(path.resolve(process.cwd(), "buttler.db"));
    const db = drizzle(sqlite);

    migrate(db, {
      migrationsFolder: path.resolve(process.cwd(), "drizzle"),
    });
    sqlite.close();

    fetch(new URL("/work", `http://localhost:${process.env.PORT}`), {
      method: "POST",
      body: JSON.stringify({
        secret: process.env.WEBHOOK_SECRET,
        recover: true,
      }),
    });
  }
}