import fs from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { drizzle } from "drizzle-orm/node-sqlite";
import { relations } from "./relations";

export function getDatabasePath() {
  if (process.env.BUTTLER_DB_PATH) {
    return process.env.BUTTLER_DB_PATH;
  }
  const buttlerDir = path.resolve(homedir(), ".buttler");
  if (!fs.existsSync(buttlerDir)) {
    fs.mkdirSync(buttlerDir, { recursive: true });
  }
  return path.resolve(buttlerDir, "database.sqlite");
}

const client = new DatabaseSync(getDatabasePath());
const db = drizzle({ client, relations });

export default db;
