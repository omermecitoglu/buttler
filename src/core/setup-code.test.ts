import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getLogPath, openLogFile } from "./log-file";
import { deleteSetupCode, ensureSetupCode, getSetupLink, isSetupCode, readSetupCode } from "./setup-code";

let home: string;

beforeEach(() => {
  home = fs.mkdtempSync(path.join(os.tmpdir(), "buttler-"));
  vi.stubEnv("BUTTLER_HOME", path.join(home, "new"));
});

afterEach(() => {
  vi.unstubAllEnvs();
  fs.rmSync(home, { recursive: true });
});

describe("setup code", () => {
  it("should not exist before it's needed", () => {
    expect(readSetupCode()).toBeNull();
    expect(getSetupLink()).toBeNull();
  });

  it("should stay the same until it's deleted", () => {
    const code = ensureSetupCode();
    expect(code).toHaveLength(43);
    expect(ensureSetupCode()).toBe(code);
    deleteSetupCode();
    expect(ensureSetupCode()).not.toBe(code);
  });

  it("should only be readable by its owner", () => {
    ensureSetupCode();
    expect(fs.statSync(path.join(home, "new", "setup-code")).mode & 0o777).toBe(0o600);
  });

  it("should replace an empty file", () => {
    ensureSetupCode();
    fs.writeFileSync(path.join(home, "new", "setup-code"), "");
    expect(isSetupCode("")).toBe(false);
    expect(ensureSetupCode()).toHaveLength(43);
  });

  it("should only accept the right code", () => {
    const code = ensureSetupCode();
    expect(isSetupCode(code)).toBe(true);
    expect(isSetupCode(`${code}x`)).toBe(false);
    expect(isSetupCode("wrong")).toBe(false);
    expect(isSetupCode("")).toBe(false);
    expect(isSetupCode(null)).toBe(false);
    expect(isSetupCode(undefined)).toBe(false);
  });

  it("should not accept anything after it's deleted", () => {
    const code = ensureSetupCode();
    deleteSetupCode();
    expect(isSetupCode(code)).toBe(false);
    expect(() => deleteSetupCode()).not.toThrow();
  });

  it("should be a part of the link", () => {
    const code = ensureSetupCode();
    expect(getSetupLink()).toBe(`http://localhost:7777/auth/setup?code=${code}`);
  });

  it("should have a link for the domain too", () => {
    const code = ensureSetupCode();
    expect(getSetupLink("https://buttler.example.com")).toBe(`https://buttler.example.com/auth/setup?code=${code}`);
  });
});

describe("log file", () => {
  function write(content: string) {
    const file = openLogFile();
    fs.writeSync(file, content);
    fs.closeSync(file);
  }

  it("should keep the log of the previous start", () => {
    write("first");
    write("second");
    write("third");
    expect(fs.readFileSync(getLogPath(), "utf-8")).toBe("third");
    expect(fs.readFileSync(`${getLogPath()}.old`, "utf-8")).toBe("second");
  });

  it("should only be readable by its owner", () => {
    write("content");
    expect(fs.statSync(getLogPath()).mode & 0o777).toBe(0o600);
  });
});
