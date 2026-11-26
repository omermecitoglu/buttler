import { describe, expect, it } from "vitest";
import { parseEnvVariables } from "./parseEnvVariables";
import { stringifyEnvVariables } from "./stringifyEnvVariables";

describe("stringifyEnvVariables", () => {
  it("should write plain values without quotes", () => {
    const output = stringifyEnvVariables([
      { key: "FOO", value: "bar" },
      { key: "URL", value: "postgres://user:pass@host/db?ssl=true" },
      { key: "EMPTY", value: "" },
    ]);
    expect(output).toBe("FOO=bar\nURL=postgres://user:pass@host/db?ssl=true\nEMPTY=");
  });

  it("should quote values that need it", () => {
    const output = stringifyEnvVariables([
      { key: "SPACES", value: "hello world" },
      { key: "MULTI", value: "line one\nline two" },
      { key: "MIXED", value: "it's \"quoted\" \\ here" },
    ]);
    expect(output).toBe("SPACES=\"hello world\"\nMULTI=\"line one\\nline two\"\nMIXED=\"it's \\\"quoted\\\" \\\\ here\"");
  });

  it("should write every variable on one line", () => {
    const output = stringifyEnvVariables([
      { key: "KEY", value: "-----BEGIN PRIVATE KEY-----\nAAAA\r\n-----END PRIVATE KEY-----" },
      { key: "FOO", value: "bar" },
    ]);
    expect(output.split("\n")).toEqual([
      "KEY=\"-----BEGIN PRIVATE KEY-----\\nAAAA\\r\\n-----END PRIVATE KEY-----\"",
      "FOO=bar",
    ]);
  });

  it("should be read back by parseEnvVariables", () => {
    const variables = [
      { key: "FOO", value: "bar" },
      { key: "KEY", value: "-----BEGIN PRIVATE KEY-----\nAAAA\n-----END PRIVATE KEY-----" },
      { key: "HASH", value: "a #b" },
      { key: "TRICKY", value: "it's\n\"multi\"\r\nline \\n" },
      { key: "EMPTY", value: "" },
    ];
    const parsed = parseEnvVariables(stringifyEnvVariables(variables));
    expect(parsed).toEqual(Object.fromEntries(variables.map(({ key, value }) => [key, value])));
  });
});
