// NOTE (v2 roadmap): Deprecated legacy operation pending Phase 4 redesign.
import type database from "~/database";

export default async function deleteServiceLink(_db: typeof database, _clientId: string, _providerId: string) {
  return null;
}
