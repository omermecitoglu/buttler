import { kebabCase, snakeCase } from "change-case";

export function getProviderVariables(
  serviceName: string,
  providerName: string,
  providerType: string,
  providerVariables: Record<string, string>,
): Record<string, string> {
  switch (providerType) {
    case "postgres":
      return {
        POSTGRES_HOST: kebabCase(providerName),
        POSTGRES_PORT: "5432",
        POSTGRES_USER: "postgres",
        POSTGRES_PASSWORD: providerVariables.POSTGRES_PASSWORD,
        POSTGRES_DATABASE: snakeCase(serviceName),
      };
    case "redis":
      return {
        REDIS_HOST: kebabCase(providerName),
        REDIS_PORT: "6379",
      };
    default:
      return {};
  }
}
