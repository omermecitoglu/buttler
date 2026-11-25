import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { getFilePath } from "./storage";

// Also used by the CLI, which prints the link

export const DASHBOARD_URL = "http://localhost:7777";
const CODE_LENGTH = 32;

function getSetupCodePath() {
  return getFilePath("", "setup-code");
}

/** Returns null if there is nothing to set up */
export function readSetupCode() {
  try {
    return fs.readFileSync(getSetupCodePath(), "utf-8").trim() || null;
  } catch {
    return null;
  }
}

/** An interrupted setup continues with the same code */
export function ensureSetupCode() {
  const existing = readSetupCode();
  if (existing !== null) return existing;
  const code = crypto.randomBytes(CODE_LENGTH).toString("base64url");
  const codePath = getSetupCodePath();
  fs.mkdirSync(path.dirname(codePath), { recursive: true });
  fs.rmSync(codePath, { force: true });
  fs.writeFileSync(codePath, code, { mode: 0o600, flag: "wx" });
  return code;
}

/** The code can't be used anymore */
export function deleteSetupCode() {
  fs.rmSync(getSetupCodePath(), { force: true });
}

export function isSetupCode(value: string | null | undefined) {
  const code = readSetupCode();
  if (code === null || !value) return false;
  // The lengths must be the same for the comparison
  const hash = (text: string) => crypto.createHash("sha256").update(text).digest();
  return crypto.timingSafeEqual(hash(code), hash(value));
}

/** Returns null if there is nothing to set up. The origins don't share the session, so each of them needs the link. */
export function getSetupLink(origin = DASHBOARD_URL) {
  const code = readSetupCode();
  return code === null ? null : `${origin}/auth/setup?code=${code}`;
}
