import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import env from "~/core/env";
import * as schema from "./schema";

const client = new Database(path.resolve(env.CURRENT_WORKING_DIRECTORY, "buttler.db"));
const db = drizzle({ schema, client });

export default db;
