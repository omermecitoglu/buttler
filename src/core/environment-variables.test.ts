import { describe, expect, it } from "vitest";
import { type ServiceEnvironmentVariable, getBuildArgs, getBuildSecrets, getRuntimeVariables } from "./environment-variables";

const variables: ServiceEnvironmentVariable[] = (["build", "runtime", "both"] as const).flatMap(scope => [
  { key: `${scope}_plain`, value: "1", scope, isSecret: false },
  { key: `${scope}_secret`, value: "2", scope, isSecret: true },
]);

describe("environment variable scopes", () => {
  it("should pass plain and secret variables to the container", () => {
    expect(Object.keys(getRuntimeVariables(variables))).toEqual([
      "runtime_plain", "runtime_secret", "both_plain", "both_secret",
    ]);
  });

  it("should separate build args from build secrets", () => {
    expect(getBuildArgs(variables)).toEqual({ build_plain: "1", both_plain: "1" });
    expect(getBuildSecrets(variables)).toEqual({ build_secret: "2", both_secret: "2" });
  });

  it("should handle services without variables", () => {
    expect(getRuntimeVariables()).toEqual({});
    expect(getBuildArgs()).toEqual({});
    expect(getBuildSecrets()).toEqual({});
  });
});
