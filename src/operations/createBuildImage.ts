// NOTE (v2 roadmap): Build images in v2 are managed directly via Docker as runtime state.
// This legacy operation is preserved for reference until Phase 3 build pipeline redesign.

import type database from "~/database";
import type { NewBuildImageDTO } from "~/models/build-image";

export default async function createBuildImage(_db: typeof database, _data: NewBuildImageDTO) {
  return null;
}
