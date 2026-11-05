// NOTE (v2 roadmap): Nginx reverse proxy configuration generator is being redesigned in Phase 4.
// This legacy v1 function is commented out pending the Phase 4 redesign.

export async function generateNginxConfig(_appHostName?: string) {
  return "events {}\n\nhttp {}\n";
}
