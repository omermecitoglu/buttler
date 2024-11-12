import path from "node:path";
import type { Config } from "drizzle-kit";

const cwd = process.env.CURRENT_WORKING_DIRECTORY || process.cwd();

export default {
  dialect: "sqlite",
  schema: "./src/database/schema/*.ts",
  out: "./drizzle",
  dbCredentials: {
    url: path.resolve(cwd, "buttler.db"),
  },
  casing: "snake_case",
} satisfies Config;
