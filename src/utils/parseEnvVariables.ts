export function parseEnvVariables(text: string): Record<string, string> {
  const lines = text.split("\n").map(line => line.trim());
  const envVariables: Record<string, string> = {};

  let currentKey: string | null = null;
  let currentValue: string[] = [];

  for (const line of lines) {
    if (line.startsWith("#")) {
      continue; // Skip commented lines
    }
    if (currentKey) {
      currentValue.push(line);
      if (line.endsWith('"')) {
        envVariables[currentKey] = currentValue.join("\n").slice(1, -1); // Remove surrounding quotes
        currentKey = null;
        currentValue = [];
      }
    } else {
      const [key, ...valueParts] = line.split("=");
      const value = valueParts.join("=");
      if (key && value.startsWith('"') && !value.endsWith('"')) {
        currentKey = key.trim();
        currentValue.push(value);
      } else if (key) {
        envVariables[key.trim()] = value.trim();
      }
    }
  }

  return envVariables;
}
