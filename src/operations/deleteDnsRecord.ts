import { eq } from "drizzle-orm";
import type database from "~/database";
import { dnsRecords } from "~/database/schema/dns-records";
import type { DnsRecordDTO } from "~/models/dns-record";

/** Only forgets the record, it must be deleted in Cloudflare before */
export default async function deleteDnsRecord(db: typeof database, hostname: DnsRecordDTO["hostname"]) {
  await db.delete(dnsRecords).where(eq(dnsRecords.hostname, hostname));
}
