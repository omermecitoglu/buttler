// NOTE (v2 roadmap): Legacy v1 backup route.
// Database backups are being redesigned in Phase 4.
import { requireUser } from "~/core/auth";
import type { NextRequest } from "next/server";

export async function POST(_request: NextRequest) {
  await requireUser();
  return Response.json({ success: true, message: "Backup route pending Phase 4 redesign" });
}
