"use server";
// NOTE (v2 roadmap): Legacy v1 service networks action.
// Networks and links in v2 use point-to-point Docker networks (Phase 4 redesign).
import { requireUser } from "~/core/auth";

export async function create(_serviceId: string) {
  await requireUser();
  // Deprecated in v2
}

export async function destroy(_networkId: string, _: FormData) {
  await requireUser();
  // Deprecated in v2
}

export async function connect(_serviceId: string, _providerId: string, _: FormData) {
  await requireUser();
  // Deprecated in v2
}
