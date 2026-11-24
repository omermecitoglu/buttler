/**
 * Returns a value that is shared by the whole process. Next.js bundles pages (with their server
 * actions) and route handlers separately, so each of them has its own copy of a module's variables.
 */
export function getSharedState<T>(name: string, create: () => T): T {
  const key = Symbol.for(`buttler.${name}`);
  const store = globalThis as unknown as Record<symbol, T | undefined>;
  return store[key] ??= create();
}
