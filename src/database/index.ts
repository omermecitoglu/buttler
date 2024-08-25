import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const sqlite = new Database(path.resolve(process.cwd(), "buttler.db"));
const db = drizzle(sqlite, { schema });

export default db;
