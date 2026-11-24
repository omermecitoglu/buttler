import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { getFilePath } from "~/core/storage";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const PREFIX = "v1:";

export function getSecretKeyPath() {
  return getFilePath("", "secret.key");
}

function hasErrorCode(error: unknown, code: string) {
  return error instanceof Error && "code" in error && error.code === code;
}

function readKey() {
  const keyPath = getSecretKeyPath();
  let content: string;
  try {
    content = fs.readFileSync(keyPath, "utf-8");
  } catch (error) {
    if (hasErrorCode(error, "ENOENT")) return null;
    throw error;
  }
  const key = Buffer.from(content.trim(), "hex");
  if (key.length !== KEY_LENGTH) {
    throw new Error(`The secret key is not valid: ${keyPath}`);
  }
  return key;
}

function createKey() {
  const keyPath = getSecretKeyPath();
  const temporaryPath = `${keyPath}.${crypto.randomUUID()}`;
  fs.mkdirSync(path.dirname(keyPath), { recursive: true });
  fs.writeFileSync(temporaryPath, crypto.randomBytes(KEY_LENGTH).toString("hex"), { mode: 0o600, flag: "wx" });
  try {
    // Unlike renaming, linking never replaces a key that was created in the meantime
    fs.linkSync(temporaryPath, keyPath);
  } catch (error) {
    if (!hasErrorCode(error, "EEXIST")) throw error;
  } finally {
    fs.unlinkSync(temporaryPath);
  }
}

function getOrCreateKey() {
  const existing = readKey();
  if (existing) return existing;
  createKey();
  const created = readKey();
  if (!created) throw new Error(`Failed to create the secret key: ${getSecretKeyPath()}`);
  return created;
}

/** Encrypts a value. The context must be the same while decrypting, so a value cannot be moved elsewhere. */
export function encryptSecret(value: string, context: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getOrCreateKey(), iv, { authTagLength: TAG_LENGTH });
  cipher.setAAD(Buffer.from(context));
  const content = Buffer.concat([cipher.update(value, "utf-8"), cipher.final()]);
  return PREFIX + Buffer.concat([iv, cipher.getAuthTag(), content]).toString("base64");
}

export function decryptSecret(encrypted: string, context: string): string {
  if (!encrypted.startsWith(PREFIX)) throw new Error("Unknown secret format");
  // A missing key must not be replaced, the values could never be decrypted again
  const key = readKey();
  if (!key) throw new Error(`The secret key is missing: ${getSecretKeyPath()}`);
  const bytes = Buffer.from(encrypted.slice(PREFIX.length), "base64");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, bytes.subarray(0, IV_LENGTH), {
    authTagLength: TAG_LENGTH,
  });
  decipher.setAAD(Buffer.from(context));
  decipher.setAuthTag(bytes.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH));
  return Buffer.concat([
    decipher.update(bytes.subarray(IV_LENGTH + TAG_LENGTH)),
    decipher.final(),
  ]).toString("utf-8");
}
