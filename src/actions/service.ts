"use server";
// NOTE (v2 roadmap): Legacy v1 service server actions.
// Services and operations are being redesigned from scratch in Phase 3.

export async function create(_formData: FormData) {
  // Deprecated in v2
}

export async function update(_id: string, _: unknown, _formData: FormData): Promise<Record<string, string>> {
  return {};
}

export async function destroy(_id: string, _: FormData) {
  // Deprecated in v2
}

export async function start(_serviceId: string, _: FormData) {
  // Deprecated in v2
}

export async function stop(_serviceId: string, _containerId: string, _: FormData) {
  // Deprecated in v2
}

export async function build(_id: string, _: FormData) {
  // Deprecated in v2
}

export async function attachDatabase(_serviceId: string, _databaseId: string, _: FormData) {
  // Deprecated in v2
}

export async function detachDatabase(_serviceId: string, _databaseId: string, _: FormData) {
  // Deprecated in v2
}
