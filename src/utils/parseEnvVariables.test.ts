import { describe, expect, it } from "vitest";
import { parseEnvVariables } from "./parseEnvVariables";

/* eslint-disable @stylistic/max-len */

describe("parseEnvVariables", () => {
  it("should parse environment variables correctly from a text", () => {
    const input = `
      FOO=bar
      BAZ="qux"
    `;
    const output = parseEnvVariables(input);
    expect(output).toEqual({
      FOO: "bar",
      BAZ: '"qux"',
    });
  });

  it("should parse multi-line environment variables correctly from a text", () => {
    const input = `
      FOO=bar
      MULTI_LINE_KEY="-----BEGIN PRIVATE KEY-----\nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\nAAAAAAAA\n-----END PRIVATE KEY-----"
    `;
    const output = parseEnvVariables(input);
    expect(output).toEqual({
      FOO: "bar",
      MULTI_LINE_KEY: "-----BEGIN PRIVATE KEY-----\nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\nAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA\nAAAAAAAA\n-----END PRIVATE KEY-----",
    });
  });

  it("should ignore commented lines", () => {
    const input = `
      FOO=bar
      # BAZ=qux
    `;
    const output = parseEnvVariables(input);
    expect(output).toEqual({
      FOO: "bar",
    });
  });

  it("should parse environment variables with carriage return", () => {
    const input = `
      FOO=bar\r
      BAZ=qux
    `;
    const output = parseEnvVariables(input);
    expect(output).toEqual({
      FOO: "bar",
      BAZ: "qux",
    });
  });
});
