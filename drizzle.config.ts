import path from "node:path";
import type { Config } from "drizzle-kit";

export default {
  dialect: "sqlite",
  schema: "./src/database/schema/*.ts",
  out: "./drizzle",
  dbCredentials: {
    url: path.resolve(process.cwd(), "buttler.db"),
  },
} satisfies Config;
