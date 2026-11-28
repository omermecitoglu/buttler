import { describe, expect, it } from "vitest";
import { generatePassword, getImagePreset, presetImages } from "./image-presets";
import { type SharedVariableSource, getTemplateReferences, resolveTemplate } from "./shared-variables";

describe("getImagePreset", () => {
  it.each([
    ["postgres", "postgres"],
    ["postgres:16", "postgres"],
    ["postgres:alpine", "postgres"],
    ["library/postgres:16", "postgres"],
    ["docker.io/library/mysql:8", "mysql"],
    ["mariadb@sha256:abc", "mariadb"],
    [" Redis ", "redis"],
    ["mongo:7", "mongo"],
  ])("matches %s", (image, expected) => {
    expect(getImagePreset(image)?.image).toBe(expected);
  });

  it.each([
    "",
    "bitnami/postgresql",
    "bitnami/postgres",
    "postgresql",
    "ghcr.io/library/postgres",
    "nginx",
  ])("does not match %s", image => {
    expect(getImagePreset(image)).toBeNull();
  });

  it.each(presetImages)("only refers to its own variables in %s", image => {
    const preset = getImagePreset(image)!;
    const keys = preset.variables.map(({ key }) => key);
    const source: SharedVariableSource = {
      host: "db",
      variables: preset.variables.map(({ key, value }) => ({
        key,
        value: value ?? "secret",
        scope: "runtime",
        isSecret: false,
      })),
    };
    for (const { template } of preset.sharedVariables) {
      for (const { name } of getTemplateReferences(template)) expect(keys).toContain(name);
      expect(resolveTemplate(template, source).unset).toEqual([]);
    }
  });
});

describe("generatePassword", () => {
  it("generates letters and digits", () => {
    expect(generatePassword()).toMatch(/^[A-Za-z0-9]{32}$/);
    expect(generatePassword(8)).toHaveLength(8);
  });

  it("generates a new one every time", () => {
    expect(generatePassword()).not.toBe(generatePassword());
  });
});
