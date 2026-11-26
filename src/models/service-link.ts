import { createSelectSchema } from "drizzle-orm/zod";
import { createSharedRefinements } from "drizzle-zod-shared-refinements";
import { serviceLinks } from "~/database/schema/service-links";
import type z from "zod";

const sharedRefinements = createSharedRefinements(serviceLinks, {
  id: schema => schema.readonly().describe("Unique identifier of the link"),
  serviceAId: schema => schema.describe("Service on one side of the link, the one with the lower identifier"),
  serviceBId: schema => schema.describe("Service on the other side of the link, the one with the higher identifier"),
  serviceAInherits: schema => schema.describe("Whether the service on one side inherits the shared variables of the other one"),
  serviceBInherits: schema => schema.describe("Whether the service on the other side inherits the shared variables of the first one"),
  createdAt: schema => schema.readonly().describe("Creation date of the link as an ISO 8601 date string"),
});

export const ServiceLinkDTO = createSelectSchema(serviceLinks, sharedRefinements)
  .describe("Represents a link that lets two services reach each other");

export type ServiceLinkDTO = z.infer<typeof ServiceLinkDTO>;
