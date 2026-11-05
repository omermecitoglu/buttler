// NOTE (v2 roadmap): Docker networks are managed directly via Dockerode in v2.
// This legacy operation is preserved for reference until Phase 4 redesign.
import type database from "~/database";

type NetworkData = {
  id: string,
  serviceId: string,
  kind: "provider" | "custom",
};

export default async function createNetwork(_db: typeof database, _data: NetworkData) {
  return null;
}
