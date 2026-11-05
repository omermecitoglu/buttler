// NOTE (v2 roadmap): Environment variables will be redesigned in Phase 3.
import type database from "~/database";

export async function syncEnvironmentVariables(_db: typeof database, _serviceId: string, _variables: Record<string, string>) {
  return;
}
