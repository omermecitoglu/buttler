import { describe, expect, it } from "vitest";
import { parseEnvVariables } from "./parseEnvVariables";

/* eslint-disable @stylistic/max-len */

describe("parseEnvVariables", () => {
  it("should parse environment variables correctly from a text", () => {
    const input = `
      FOO=bar
      BAZ="qux"
      SINGLE='quoted value'
      URL=postgres://user:pass@host/db?ssl=true
      EMPTY=
    `;
    expect(parseEnvVariables(input)).toEqual({
      FOO: "bar",
      BAZ: "qux",
      SINGLE: "quoted value",
      URL: "postgres://user:pass@host/db?ssl=true",
      EMPTY: "",
    });
  });

  it("should parse multi-line environment variables correctly from a text", () => {
    const input = `
      FOO=bar
      MULTI_LINE_KEY="-----BEGIN PRIVATE KEY-----\nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\nAAAAAAAA\n-----END PRIVATE KEY-----"
      AFTER=value
    `;
    expect(parseEnvVariables(input)).toEqual({
      FOO: "bar",
      MULTI_LINE_KEY: "-----BEGIN PRIVATE KEY-----\nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\nAAAAAAAA\n-----END PRIVATE KEY-----",
      AFTER: "value",
    });
  });

  it("should keep the lines of a multi-line value as they are", () => {
    const input = "TEXT='first\n  indented # not a comment\nlast'";
    expect(parseEnvVariables(input)).toEqual({
      TEXT: "first\n  indented # not a comment\nlast",
    });
  });

  it("should read escapes in double quoted values only", () => {
    const input = "DOUBLE=\"a\\nb \\\"c\\\" d\\\\e\"\nSINGLE='a\\nb'";
    expect(parseEnvVariables(input)).toEqual({
      DOUBLE: "a\nb \"c\" d\\e",
      SINGLE: "a\\nb",
    });
  });

  it("should ignore commented lines and inline comments", () => {
    const input = `
      FOO=bar # a comment
      # BAZ=qux
      QUOTED="value" # another comment
      export EXPORTED=yes
    `;
    expect(parseEnvVariables(input)).toEqual({
      FOO: "bar",
      QUOTED: "value",
      EXPORTED: "yes",
    });
  });

  it("should parse environment variables with carriage return", () => {
    const input = "FOO=bar\r\nBAZ=\"multi\r\nline\"\r\n";
    expect(parseEnvVariables(input)).toEqual({
      FOO: "bar",
      BAZ: "multi\nline",
    });
  });

  it("should return null for text that is not in .env format", () => {
    expect(parseEnvVariables("")).toBeNull();
    expect(parseEnvVariables("# only a comment")).toBeNull();
    expect(parseEnvVariables("just some text")).toBeNull();
    expect(parseEnvVariables("postgres://user:pass@host/db?ssl=true")).toBeNull();
    expect(parseEnvVariables("FOO=bar\nnot a variable")).toBeNull();
    expect(parseEnvVariables("FOO=\"never closed")).toBeNull();
    expect(parseEnvVariables("FOO=\"closed\" trailing")).toBeNull();
  });
});
