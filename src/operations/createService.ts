import type { ServiceEnvironmentVariable } from "~/core/environment-variables";
import { encryptSecret } from "~/core/secrets";
import type database from "~/database";
import { environmentVariables as environmentVariablesTable } from "~/database/schema/environment-variables";
import { ports as portsTable } from "~/database/schema/ports";
import { services } from "~/database/schema/services";
import { volumes as volumesTable } from "~/database/schema/volumes";
import type { NewServiceDTO } from "~/models/service";
import { getSecretContext } from "./getSecretContext";

export type CreateServiceOptions = NewServiceDTO & {
  ports?: { external: number, internal: number }[],
  environmentVariables?: ServiceEnvironmentVariable[],
  volumes?: { name: string, containerPath: string }[],
};

export default function createService(db: typeof database, options: CreateServiceOptions) {
  const { ports, environmentVariables, volumes, ...serviceData } = options;
  const serviceId = crypto.randomUUID();

  return db.transaction(tx => {
    const service = tx.insert(services).values({
      id: serviceId,
      ...serviceData,
    }).returning().get();

    if (ports && ports.length > 0) {
      tx.insert(portsTable).values(ports.map(p => ({
        serviceId: service.id,
        external: p.external,
        internal: p.internal,
      }))).run();
    }

    if (environmentVariables && environmentVariables.length > 0) {
      tx.insert(environmentVariablesTable).values(environmentVariables.map(env => ({
        serviceId: service.id,
        key: env.key,
        value: env.isSecret ? encryptSecret(env.value, getSecretContext(service.id, env.key)) : env.value,
        scope: env.scope,
        isSecret: env.isSecret,
      }))).run();
    }

    if (volumes && volumes.length > 0) {
      tx.insert(volumesTable).values(volumes.map(vol => ({
        id: crypto.randomUUID(),
        serviceId: service.id,
        name: vol.name,
        containerPath: vol.containerPath,
      }))).run();
    }

    return service;
  });
}
