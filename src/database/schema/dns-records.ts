import { snakeCase, text } from "drizzle-orm/sqlite-core";

/** What is known about the hostnames in Cloudflare. A row outlives its domain until the DNS record is deleted. */
export const dnsRecords = snakeCase.table("dns_records", {
  hostname: text().primaryKey(),
  zoneId: text(),
  /** Only the records that belong to Buttler, others are never saved */
  recordId: text(),
  /** The tunnel that the record points to */
  tunnelId: text(),
  failure: text({ enum: ["unreachable", "connection_lost", "no_zone", "taken", "rejected"] }),
  /** The message of Cloudflare, or the records that a hostname is taken by */
  failureDetails: text(),
});
