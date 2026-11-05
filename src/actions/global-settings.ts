"use server";
// NOTE (v2 roadmap): Legacy v1 global settings action.
// Global variables table was removed in v2 schema; settings will be redesigned in Phase 5.

export async function setGlobalVariable(_key: string, _value: string) {
  return { success: true };
}
