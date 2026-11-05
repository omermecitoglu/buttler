// NOTE (v2 roadmap): Deprecated legacy operation pending Phase 3 redesign.
import type database from "~/database";
import type { BuildImageDTO } from "~/models/build-image";

export default async function getBuildImages(_db: typeof database, _serviceId: string): Promise<BuildImageDTO[]> {
  return [];
}
