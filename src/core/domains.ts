const MAX_HOSTNAME_LENGTH = 253;

const label = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

/** Hostnames are not case-sensitive, so they are only stored and compared in lowercase */
export function normalizeHostname(hostname: string) {
  return hostname.trim().toLowerCase();
}

/** Accepts exact, normalized hostnames. Wildcards, schemes, ports, paths and IP addresses are not hostnames. */
export function isHostname(hostname: string) {
  if (hostname.length > MAX_HOSTNAME_LENGTH) return false;
  const labels = hostname.split(".");
  if (labels.length < 2 || !labels.every(part => label.test(part))) return false;
  // A top-level domain is never numeric, so this is an IP address
  return !(/^\d+$/).test(labels[labels.length - 1]);
}

export function isPort(port: number) {
  return Number.isInteger(port) && port >= 1 && port <= 65535;
}
