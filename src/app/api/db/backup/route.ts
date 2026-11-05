// NOTE (v2 roadmap): Legacy v1 backup route.
// Database backups are being redesigned in Phase 4.
import type { NextRequest } from "next/server";

export async function POST(_request: NextRequest) {
  return Response.json({ success: true, message: "Backup route pending Phase 4 redesign" });
}
