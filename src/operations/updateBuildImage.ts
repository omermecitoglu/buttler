// NOTE (v2 roadmap): Deprecated legacy operation pending Phase 3 redesign.
import type database from "~/database";
import type { BuildImagePatchDTO } from "~/models/build-image";

export default async function updateBuildImage(_db: typeof database, _buildImageId: string, _data: BuildImagePatchDTO) {
  return null;
}
