const plainValuePattern = /^[^\s"'`#\\]*$/;

function quoteValue(value: string) {
  if (plainValuePattern.test(value)) return value;
  const escaped = value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, "\\\"")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r");
  return `"${escaped}"`;
}

/**
 * Writes variables as `.env` text, which `parseEnvVariables` reads back. Values that
 * need quotes are wrapped in double quotes, and line breaks are written as `\n` so that
 * every variable stays on one line.
 */
export function stringifyEnvVariables(variables: { key: string, value: string }[]): string {
  return variables
    .map(({ key, value }) => `${key}=${quoteValue(value)}`)
    .join("\n");
}
