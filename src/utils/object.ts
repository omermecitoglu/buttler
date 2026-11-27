export function pick<T extends object, K extends keyof T>(object: T, ...keys: K[]) {
  return Object.fromEntries(Object.entries(object).filter(([key]) => keys.includes(key as K))) as Pick<T, K>;
}
