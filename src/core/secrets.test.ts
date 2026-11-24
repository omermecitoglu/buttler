import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { decryptSecret, encryptSecret, getSecretKeyPath } from "./secrets";

describe("secrets", () => {
  let home: string;

  beforeEach(() => {
    home = fs.mkdtempSync(path.join(os.tmpdir(), "buttler-secrets-"));
    vi.stubEnv("BUTTLER_HOME", home);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    fs.rmSync(home, { recursive: true, force: true });
  });

  it("should decrypt what it encrypts", () => {
    const encrypted = encryptSecret("pässword\n✓", "srv:KEY");
    expect(encrypted).not.toContain("password");
    expect(decryptSecret(encrypted, "srv:KEY")).toBe("pässword\n✓");
    expect(decryptSecret(encryptSecret("", "srv:KEY"), "srv:KEY")).toBe("");
    expect(encryptSecret("a", "srv:KEY")).not.toBe(encryptSecret("a", "srv:KEY"));
  });

  it("should keep the key private and not leave temporary files", () => {
    encryptSecret("a", "srv:KEY");
    expect(fs.statSync(getSecretKeyPath()).mode & 0o777).toBe(0o600);
    expect(fs.readdirSync(home)).toEqual(["secret.key"]);
  });

  it("should reject tampered values and other contexts", () => {
    const encrypted = encryptSecret("value", "srv:KEY");
    expect(() => decryptSecret(encrypted, "srv:OTHER")).toThrow();
    const bytes = Buffer.from(encrypted.slice(3), "base64");
    bytes[bytes.length - 1] ^= 1;
    expect(() => decryptSecret(`v1:${bytes.toString("base64")}`, "srv:KEY")).toThrow();
    expect(() => decryptSecret("plain", "srv:KEY")).toThrow("Unknown secret format");
  });

  it("should not replace a missing or invalid key while decrypting", () => {
    const encrypted = encryptSecret("value", "srv:KEY");
    fs.writeFileSync(getSecretKeyPath(), "short");
    expect(() => decryptSecret(encrypted, "srv:KEY")).toThrow("not valid");
    expect(() => encryptSecret("value", "srv:KEY")).toThrow("not valid");
    fs.unlinkSync(getSecretKeyPath());
    expect(() => decryptSecret(encrypted, "srv:KEY")).toThrow("missing");
    expect(fs.existsSync(getSecretKeyPath())).toBe(false);
  });
});
