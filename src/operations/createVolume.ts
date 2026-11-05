// NOTE (v2 roadmap): Volumes in v2 are managed directly via Docker as runtime state.
// This legacy operation is preserved for reference until Phase 4 redesign.
import type database from "~/database";

export default async function createVolume(_db: typeof database, _data: { serviceId: string, containerPath: string }) {
  return null;
}
