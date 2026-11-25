import { describe, expect, it } from "vitest";
import { findZone, getSubdomain, isCoveredByCertificate, isHostname, isPort, joinHostname, normalizeHostname } from "./domains";

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

describe("zones", () => {
  const zones = [{ name: "example.com" }, { name: "app.example.com" }];

  it.each([
    ["example.com", "example.com"],
    ["www.example.com", "example.com"],
    ["app.example.com", "app.example.com"],
    ["www.app.example.com", "app.example.com"],
  ])("should find the most specific zone of %s", (hostname, name) => {
    expect(findZone(hostname, zones)).toEqual({ name });
  });

  it("should not mistake a similar name for a subdomain", () => {
    expect(findZone("notexample.com", zones)).toBeUndefined();
  });

  it.each([
    ["", "example.com"],
    ["www", "www.example.com"],
    ["a.b", "a.b.example.com"],
  ])("should join and split the subdomain \"%s\"", (subdomain, hostname) => {
    expect(joinHostname(subdomain, "example.com")).toBe(hostname);
    expect(getSubdomain(hostname, "example.com")).toBe(subdomain);
  });

  it("should know that the certificate only covers one level", () => {
    expect(isCoveredByCertificate("")).toBe(true);
    expect(isCoveredByCertificate("www")).toBe(true);
    expect(isCoveredByCertificate("a.b")).toBe(false);
  });
});
