import "server-only";
import type { ServiceDTO } from "~/models/service";

// NOTE (v2 roadmap): Service runtime management (Docker containers) is being redesigned in Phase 3.
// This legacy v1 function is commented out pending the Phase 3 redesign.

export async function startService(_service: ServiceDTO, _readOnlyFiles?: Record<string, string>) {
  // Pending Phase 3 redesign
}

export async function stopService(_serviceId: ServiceDTO["id"], _containerId: string) {
  // Pending Phase 3 redesign
}
