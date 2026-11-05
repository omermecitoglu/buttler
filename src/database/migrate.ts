import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { drizzle } from "drizzle-orm/node-sqlite";
import { migrate } from "drizzle-orm/node-sqlite/migrator";
import { getDatabasePath } from "./index";

function migrateAppDatabase() {
  const cwd = process.env.CURRENT_WORKING_DIRECTORY || process.cwd();
  const migrationsFolder = process.env.DRIZZLE_DIR || path.resolve(cwd, "drizzle");
  const sqlite = new DatabaseSync(getDatabasePath());
  const db = drizzle({ client: sqlite });

  migrate(db, { migrationsFolder });
  sqlite.close();
}

export default migrateAppDatabase;
