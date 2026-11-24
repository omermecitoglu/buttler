"use server";
// NOTE (v2 roadmap): Legacy v1 server action.
// Database backup operations are being redesigned in Phase 4.
import { requireUser } from "~/core/auth";

export async function backup(_serviceId: string, _: FormData) {
  await requireUser();
  // Deprecated in v2
}
