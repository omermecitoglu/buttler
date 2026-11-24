import { describe, expect, it } from "vitest";
import { isHostname, isPort, normalizeHostname } from "./domains";

describe("normalizeHostname", () => {
  it("should ignore the case and the surrounding spaces", () => {
    expect(normalizeHostname("  App.Example.COM ")).toBe("app.example.com");
  });
});

describe("isHostname", () => {
  it.each([
    "example.com",
    "app.example.com",
    "a.b.c.example.co.uk",
    "my-app.example.com",
    "xn--bcher-kva.example",
    `${"a".repeat(63)}.com`,
  ])("should accept \"%s\"", hostname => {
    expect(isHostname(hostname)).toBe(true);
  });

  it.each([
    "",
    "localhost",
    "*.example.com",
    "https://example.com",
    "example.com:80",
    "example.com/path",
    "example.com.",
    ".example.com",
    "app..example.com",
    "-app.example.com",
    "app-.example.com",
    "my_app.example.com",
    "my app.example.com",
    "App.example.com",
    "example.com;",
    "example.com\n",
    "192.168.1.1",
    `${"a".repeat(64)}.com`,
    `${"a.".repeat(126)}com`,
  ])("should reject \"%s\"", hostname => {
    expect(isHostname(hostname)).toBe(false);
  });
});

describe("isPort", () => {
  it.each([1, 80, 65535])("should accept %d", port => {
    expect(isPort(port)).toBe(true);
  });

  it.each([0, -1, 65536, 80.5, Number.NaN])("should reject %d", port => {
    expect(isPort(port)).toBe(false);
  });
});
