export function safeParseJSON<T>(json: string, defaultValue: T | null = null) {
  try {
    return JSON.parse(json) as T;
  } catch {
    return defaultValue;
  }
}
