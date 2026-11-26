import { decryptSecret } from "~/core/secrets";
import type database from "~/database";
import getInheritedVariables from "./getInheritedVariables";
import { getSecretContext } from "./getSecretContext";

/** Returns a service with its decrypted secrets, it must never be cached or sent to the browser */
export default async function getDeployableService(db: typeof database, serviceId: string) {
  const service = await db.query.services.findFirst({
    where: { id: serviceId },
    with: {
      ports: true,
      environmentVariables: true,
      volumes: true,
    },
  });
  if (!service) return null;
  const inheritedVariables = await getInheritedVariables(db, serviceId, { decrypt: true });
  return {
    ...service,
    environmentVariables: service.environmentVariables.map(variable => ({
      ...variable,
      value: variable.isSecret
        ? decryptSecret(variable.value, getSecretContext(serviceId, variable.key))
        : variable.value,
    })),
    /** Runtime-only, the hand-written variables of the service win */
    inheritedVariables: Object.fromEntries(inheritedVariables.map(({ name, value }) => [name, value ?? ""])),
  };
}
