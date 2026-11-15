import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import { createSharedRefinements } from "drizzle-zod-shared-refinements";
import { ports } from "~/database/schema/ports";
import type z from "zod";

const sharedRefinements = createSharedRefinements(ports, {
  serviceId: schema => schema.describe("Service identifier this port belongs to"),
  external: schema => schema.min(1).max(65535).describe("External host port number (1-65535)"),
  internal: schema => schema.min(1).max(65535).describe("Internal container port number (1-65535)"),
});

export const PortDTO = createSelectSchema(ports, sharedRefinements)
  .describe("Represents a port mapping definition");

export const NewPortDTO = createInsertSchema(ports, sharedRefinements)
  .describe("Data Transfer Object for creating a new port mapping");

export const PortPatchDTO = createUpdateSchema(ports, sharedRefinements)
  .describe("Data Transfer Object for updating an existing port mapping");

export type Port = z.infer<typeof PortDTO>;
export type NewPort = z.infer<typeof NewPortDTO>;
export type PortPatch = z.infer<typeof PortPatchDTO>;

export type PortDTO = Port;
export type NewPortDTO = NewPort;
export type PortPatchDTO = PortPatch;
