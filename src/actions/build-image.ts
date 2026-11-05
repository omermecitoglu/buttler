"use server";
// NOTE (v2 roadmap): Legacy v1 server action.
// Build images in v2 are managed directly via Docker as runtime state.
// Commented out pending Phase 3 redesign.

export async function destroy(_id: string, _: FormData) {
  // Deprecated in v2
}
