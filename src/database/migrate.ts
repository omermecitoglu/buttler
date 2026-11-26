import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { drizzle } from "drizzle-orm/node-sqlite";
import { migrate } from "drizzle-orm/node-sqlite/migrator";
import { getDatabasePath } from "./index";

function migrateAppDatabase() {
  // The CLI sets DRIZZLE_DIR, the fallback is for npm run dev and npm run build:migration in the repository
  const migrationsFolder = process.env.DRIZZLE_DIR || path.resolve("drizzle");
  const sqlite = new DatabaseSync(getDatabasePath());
  const db = drizzle({ client: sqlite });

  migrate(db, { migrationsFolder });
  sqlite.close();
}

export default migrateAppDatabase;
