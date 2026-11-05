// NOTE (v2 roadmap): Deprecated legacy operation pending Phase 3 redesign.
import type database from "~/database";

export default async function deleteBuildImage(_db: typeof database, _buildImageId: string) {
  return null;
}
