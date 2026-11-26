import { describe, expect, it } from "vitest";
import {
  type SharedVariableSource,
  getServiceHost,
  getTemplateReferences,
  getUnknownPlaceholders,
  resolveTemplate,
} from "./shared-variables";

const source: SharedVariableSource = {
  host: getServiceHost("db"),
  variables: [
    { key: "POSTGRES_USER", value: "admin", scope: "runtime", isSecret: false },
    { key: "POSTGRES_PASSWORD", value: "hunter2", scope: "both", isSecret: true },
    { key: "EMPTY", value: "", scope: "runtime", isSecret: false },
    { key: "BUILD_ONLY", value: "x", scope: "build", isSecret: false },
  ],
};

describe("shared variable templates", () => {
  it("should resolve the host and the runtime variables", () => {
    expect(resolveTemplate("postgres://{env.POSTGRES_USER}@{host}:5432", source)).toEqual({
      value: "postgres://admin@buttler-service-db:5432",
      isSecret: false,
      unset: [],
    });
  });

  it("should keep plain values as they are", () => {
    expect(resolveTemplate("5432", source)).toEqual({ value: "5432", isSecret: false, unset: [] });
  });

  it("should mark values that are built from a secret as secret", () => {
    expect(resolveTemplate("{env.POSTGRES_PASSWORD}", source)).toEqual({
      value: "hunter2",
      isSecret: true,
      unset: [],
    });
  });

  it("should mask secrets that can't be read", () => {
    const masked: SharedVariableSource = {
      ...source,
      variables: source.variables.map(variable => (variable.isSecret ? { ...variable, value: null } : variable)),
    };
    expect(resolveTemplate("{env.POSTGRES_PASSWORD:-none}", masked, "••••")).toEqual({
      value: "••••",
      isSecret: true,
      unset: [],
    });
  });

  it("should resolve unset variables to an empty string and report them", () => {
    expect(resolveTemplate("{env.MISSING}-{env.BUILD_ONLY}-{env.MISSING}", source)).toEqual({
      value: "--",
      isSecret: false,
      unset: ["MISSING", "BUILD_ONLY"],
    });
  });

  it("should use the fallback when a variable isn't set or empty", () => {
    expect(resolveTemplate("{env.MISSING:-app}/{env.EMPTY:-}/{env.POSTGRES_USER:-x}", source)).toEqual({
      value: "app//admin",
      isSecret: false,
      unset: [],
    });
  });

  it("should keep unknown placeholders as they are", () => {
    expect(resolveTemplate("{hots}{env.}{env.A-B}", source).value).toBe("{hots}{env.}{env.A-B}");
  });

  it("should list the referenced variables", () => {
    expect(getTemplateReferences("{host}{env.A}{env.B:-b}")).toEqual([
      { name: "A", hasFallback: false },
      { name: "B", hasFallback: true },
    ]);
  });

  it("should list the unknown placeholders", () => {
    expect(getUnknownPlaceholders("{host}{hots}{env.A:-x}{env.}")).toEqual(["{hots}", "{env.}"]);
  });
});
