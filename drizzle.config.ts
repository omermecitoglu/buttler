import { homedir } from "node:os";
import path from "node:path";
import { defineConfig } from "drizzle-kit";

const dbPath = process.env.BUTTLER_DB_PATH || path.resolve(homedir(), ".buttler", "database.sqlite");

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/database/schema/index.ts",
  out: "./drizzle",
  dbCredentials: {
    url: dbPath,
  },
});
