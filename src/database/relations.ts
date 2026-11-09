import { defineRelations } from "drizzle-orm";
import * as schema from "./schema";

export const relations = defineRelations(schema, r => ({
  services: {
    volumes: r.many.volumes(),
    ports: r.many.ports(),
    environmentVariables: r.many.environmentVariables(),
  },
  volumes: {
    service: r.one.services({
      from: r.volumes.serviceId,
      to: r.services.id,
    }),
  },
  ports: {
    service: r.one.services({
      from: r.ports.serviceId,
      to: r.services.id,
    }),
  },
  environmentVariables: {
    service: r.one.services({
      from: r.environmentVariables.serviceId,
      to: r.services.id,
    }),
  },
}));
