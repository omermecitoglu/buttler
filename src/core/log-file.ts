import fs from "node:fs";
import path from "node:path";
import { getFilePath } from "./storage";

// Used by the CLI, which starts the server

export function getLogPath() {
  return getFilePath("", "buttler.log");
}

/** Opens a new log file, only the one before it is kept */
export function openLogFile() {
  const logPath = getLogPath();
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  if (fs.existsSync(logPath)) fs.renameSync(logPath, `${logPath}.old`);
  return fs.openSync(logPath, "a", 0o600);
}
