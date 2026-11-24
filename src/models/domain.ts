import { createInsertSchema, createSelectSchema } from "drizzle-orm/zod";
import { createSharedRefinements } from "drizzle-zod-shared-refinements";
import { domains } from "~/database/schema/domains";
import type z from "zod";

const sharedRefinements = createSharedRefinements(domains, {
  hostname: schema => schema.describe("Exact public hostname in lowercase"),
  serviceId: schema => schema.describe("Service identifier this domain belongs to"),
  port: schema => schema.min(1).max(65535).describe("Container port that receives the requests (1-65535)"),
  createdAt: schema => schema.readonly().describe("Creation date of the domain as an ISO 8601 date string"),
});

export const DomainDTO = createSelectSchema(domains, sharedRefinements)
  .describe("Represents a public hostname of a service");

export const NewDomainDTO = createInsertSchema(domains, sharedRefinements).omit({
  createdAt: true,
}).describe("Data Transfer Object for adding a domain to a service");

export type DomainDTO = z.infer<typeof DomainDTO>;
export type NewDomainDTO = z.infer<typeof NewDomainDTO>;
