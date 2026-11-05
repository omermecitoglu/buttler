// NOTE (v2 roadmap): Ports are managed directly via Docker as runtime state in v2.
import type database from "~/database";

export async function syncPorts(_db: typeof database, _serviceId: string, _ports: Record<number, string>) {
  return;
}
