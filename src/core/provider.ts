import { kebabCase } from "change-case";

export function getProviderVariables(serviceName: string, providerName: string, providerVariables: Record<string, string>) {
  return {
    POSTGRES_HOST: kebabCase(providerName),
    POSTGRES_PORT: "5432",
    POSTGRES_USER: "postgres",
    POSTGRES_PASSWORD: providerVariables.POSTGRES_PASSWORD,
    POSTGRES_DATABASE: kebabCase(serviceName),
  } as Record<string, string>;
}
