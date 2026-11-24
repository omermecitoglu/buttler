export const environmentVariableScopes = ["build", "runtime", "both"] as const;

export type EnvironmentVariableScope = typeof environmentVariableScopes[number];

export type ServiceEnvironmentVariable = {
  key: string,
  value: string,
  scope: EnvironmentVariableScope,
  isSecret: boolean,
};

function isBuildVariable({ scope }: ServiceEnvironmentVariable) {
  return scope === "build" || scope === "both";
}

function toRecord(variables: ServiceEnvironmentVariable[]): Record<string, string> {
  return Object.fromEntries(variables.map(({ key, value }) => [key, value]));
}

/** Variables to be passed to the container */
export function getRuntimeVariables(variables: ServiceEnvironmentVariable[] = []) {
  return toRecord(variables.filter(({ scope }) => scope === "runtime" || scope === "both"));
}

/** Non-secret variables to be passed to the build, they can be seen in the image history */
export function getBuildArgs(variables: ServiceEnvironmentVariable[] = []) {
  return toRecord(variables.filter(variable => isBuildVariable(variable) && !variable.isSecret));
}

/** Secret variables to be passed to the build, they can only be read with secret mounts */
export function getBuildSecrets(variables: ServiceEnvironmentVariable[] = []) {
  return toRecord(variables.filter(variable => isBuildVariable(variable) && variable.isSecret));
}
