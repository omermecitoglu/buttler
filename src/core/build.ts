import "server-only";
import type { ServiceDTO } from "~/models/service";

// NOTE (v2 roadmap): Build pipeline (git clone -> docker build -> docker run)
// is being redesigned in Phase 3.
// This legacy v1 function is commented out pending the Phase 3 redesign.

export async function startBuilding(_service: ServiceDTO) {
  // Pending Phase 3 redesign
  return null;
}
