export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const path = await import("node:path");
    const { default: Database } = await import("better-sqlite3");
    const { drizzle } = await import("drizzle-orm/better-sqlite3");
    const { migrate } = await import("drizzle-orm/better-sqlite3/migrator");

    const cwd = process.env.CURRENT_WORKING_DIRECTORY || process.cwd();
    const migrationsFolder = process.env.DRIZZLE_DIR || path.resolve(cwd, "drizzle");
    const sqlite = new Database(path.resolve(cwd, "buttler.db"));
    const db = drizzle(sqlite);

    migrate(db, { migrationsFolder });
    sqlite.close();
  }
}
