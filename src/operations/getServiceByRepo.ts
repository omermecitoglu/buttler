// NOTE (v2 roadmap): Deprecated legacy operation pending Phase 3 redesign.
import type database from "~/database";
import type { ServiceDTO } from "~/models/service";

export default async function getServiceByRepo(_db: typeof database, _repo: string): Promise<ServiceDTO | null> {
  return null;
}
