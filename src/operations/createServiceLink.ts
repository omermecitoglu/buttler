// NOTE (v2 roadmap): Service links in v2 use point-to-point networks.
// This legacy operation is preserved for reference until Phase 4 redesign.
import type database from "~/database";

export default async function createServiceLink(_db: typeof database, _data: { clientId: string, providerId: string }) {
  return null;
}
