import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

function migrateAppDatabase() {
  const cwd = process.env.CURRENT_WORKING_DIRECTORY || process.cwd();
  const migrationsFolder = process.env.DRIZZLE_DIR || path.resolve(cwd, "drizzle");
  const sqlite = new Database(path.resolve(cwd, "buttler.db"));
  const db = drizzle(sqlite);

  migrate(db, { migrationsFolder });
  sqlite.close();
}

export default migrateAppDatabase;
