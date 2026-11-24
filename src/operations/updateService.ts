import { eq, sql } from "drizzle-orm";
import type { EnvironmentVariableScope } from "~/core/environment-variables";
import { encryptSecret } from "~/core/secrets";
import type database from "~/database";
import { environmentVariables as environmentVariablesTable } from "~/database/schema/environment-variables";
import { ports as portsTable } from "~/database/schema/ports";
import { services } from "~/database/schema/services";
import { volumes as volumesTable } from "~/database/schema/volumes";
import type { ServicePatchDTO } from "~/models/service";
import { getSecretContext } from "./getSecretContext";

export type UpdatedEnvironmentVariable = {
  key: string,
  /** The saved value of a secret is kept if it's null */
  value: string | null,
  scope: EnvironmentVariableScope,
  isSecret: boolean,
};

export type UpdateServiceOptions = Omit<ServicePatchDTO, "type"> & {
  ports?: { external: number, internal: number }[],
  environmentVariables?: UpdatedEnvironmentVariable[],
  volumes?: { name: string, containerPath: string }[],
};

/** Thrown when a secret is renamed or turned into a plain variable without entering its value again */
export class MissingSecretValueError extends Error {
  constructor(key: string) {
    super(`The value of the variable must be entered again (${key})`);
  }
}

/** Replaces the given parts of a service, except the secrets that are left untouched */
export default function updateService(db: typeof database, serviceId: string, options: UpdateServiceOptions) {
  const { ports, environmentVariables, volumes, ...serviceData } = options;

  return db.transaction(tx => {
    const service = tx.update(services)
      // There may be nothing else to set
      .set({ ...serviceData, updatedAt: sql`(CURRENT_TIMESTAMP)` })
      .where(eq(services.id, serviceId))
      .returning()
      .get();

    if (ports) {
      tx.delete(portsTable).where(eq(portsTable.serviceId, serviceId)).run();
      if (ports.length > 0) {
        tx.insert(portsTable).values(ports.map(({ external, internal }) => ({ serviceId, external, internal }))).run();
      }
    }

    if (environmentVariables) {
      const savedVariables = tx.select()
        .from(environmentVariablesTable)
        .where(eq(environmentVariablesTable.serviceId, serviceId))
        .all();

      // Encrypted values are bound to their keys, so they can only be kept under the same key
      const getStoredValue = ({ key, value, isSecret }: UpdatedEnvironmentVariable) => {
        if (value !== null) return isSecret ? encryptSecret(value, getSecretContext(serviceId, key)) : value;
        const saved = savedVariables.find(variable => variable.key === key && variable.isSecret);
        if (!saved || !isSecret) throw new MissingSecretValueError(key);
        return saved.value;
      };

      const variables = environmentVariables.map(variable => ({
        serviceId,
        key: variable.key,
        value: getStoredValue(variable),
        scope: variable.scope,
        isSecret: variable.isSecret,
      }));

      tx.delete(environmentVariablesTable).where(eq(environmentVariablesTable.serviceId, serviceId)).run();
      if (variables.length > 0) {
        tx.insert(environmentVariablesTable).values(variables).run();
      }
    }

    if (volumes) {
      tx.delete(volumesTable).where(eq(volumesTable.serviceId, serviceId)).run();
      if (volumes.length > 0) {
        tx.insert(volumesTable).values(volumes.map(({ name, containerPath }) => ({ serviceId, name, containerPath }))).run();
      }
    }

    return service;
  });
}
