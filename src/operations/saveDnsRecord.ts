import type database from "~/database";
import { dnsRecords } from "~/database/schema/dns-records";
import type { DnsRecordPatchDTO } from "~/models/dns-record";

/** The fields that are not given are left untouched */
export default async function saveDnsRecord(db: typeof database, record: DnsRecordPatchDTO) {
  await db.insert(dnsRecords)
    .values(record)
    .onConflictDoUpdate({ target: dnsRecords.hostname, set: record });
}
