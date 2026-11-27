import { defineRelations } from "drizzle-orm";
import * as schema from "./schema";

export const relations = defineRelations(schema, r => ({
  services: {
    volumes: r.many.volumes(),
    ports: r.many.ports(),
    devices: r.many.devices(),
    environmentVariables: r.many.environmentVariables(),
    domains: r.many.domains(),
    sharedVariables: r.many.sharedVariables(),
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
  devices: {
    service: r.one.services({
      from: r.devices.serviceId,
      to: r.services.id,
    }),
  },
  domains: {
    service: r.one.services({
      from: r.domains.serviceId,
      to: r.services.id,
    }),
  },
  environmentVariables: {
    service: r.one.services({
      from: r.environmentVariables.serviceId,
      to: r.services.id,
    }),
  },
  sharedVariables: {
    service: r.one.services({
      from: r.sharedVariables.serviceId,
      to: r.services.id,
    }),
  },
}));
