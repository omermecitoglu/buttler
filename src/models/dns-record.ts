import { createInsertSchema, createSelectSchema } from "drizzle-orm/zod";
import { createSharedRefinements } from "drizzle-zod-shared-refinements";
import { dnsRecords } from "~/database/schema/dns-records";
import type z from "zod";

const sharedRefinements = createSharedRefinements(dnsRecords, {
  hostname: schema => schema.describe("Exact public hostname in lowercase"),
});

export const DnsRecordDTO = createSelectSchema(dnsRecords, sharedRefinements)
  .describe("Represents the state of a hostname in Cloudflare");

export const DnsRecordPatchDTO = createInsertSchema(dnsRecords, sharedRefinements)
  .describe("Data Transfer Object for updating the state of a hostname in Cloudflare");

export type DnsRecordDTO = z.infer<typeof DnsRecordDTO>;
export type DnsRecordPatchDTO = z.infer<typeof DnsRecordPatchDTO>;
