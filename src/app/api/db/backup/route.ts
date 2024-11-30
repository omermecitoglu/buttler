import { backupDatabase } from "~/core/backup";
import db from "~/database";
import getServices from "~/operations/getServices";
import type { NextRequest } from "next/server";

export async function POST(_request: NextRequest) {
  const services = await getServices(db, ["id"]);
  for (const service of services) {
    await backupDatabase(service.id);
  }
  return Response.json({ success: true });
}
