/** Binds an encrypted value to the variable it belongs to */
export function getSecretContext(serviceId: string, key: string) {
  return `${serviceId}:${key}`;
}
