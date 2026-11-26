const assignmentPattern = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_.]*)\s*=(.*)$/;
const doubleQuoteEscapes: Record<string, string> = { "n": "\n", "r": "\r", "t": "\t", "\"": "\"", "\\": "\\" };

/**
 * Parses `.env` text into variables, keeping their order. Values can be wrapped in
 * single, double or backtick quotes to span several lines, and double quoted values
 * can use `\n`, `\r`, `\t`, `\"` and `\\` escapes.
 *
 * Returns null if the text is not in `.env` format or has no variables.
 */
export function parseEnvVariables(text: string): Record<string, string> | null {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const envVariables: Record<string, string> = {};

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;

    const match = assignmentPattern.exec(line);
    if (!match) return null;
    const [, key, rest] = match;
    const rawValue = rest.trimStart();
    const quote = rawValue[0];

    if (quote !== "\"" && quote !== "'" && quote !== "`") {
      envVariables[key] = rawValue.replace(/\s+#.*$/, "").trim();
      continue;
    }

    // A quoted value goes on until its closing quote, which can be on a later line
    let value = "";
    let remaining = rawValue.slice(1);
    let closed = false;
    for (;;) {
      for (let position = 0; position < remaining.length; position++) {
        const char = remaining[position];
        if (quote === "\"" && char === "\\" && position + 1 < remaining.length) {
          const next = remaining[position + 1];
          value += doubleQuoteEscapes[next] ?? `\\${next}`;
          position++;
        } else if (char === quote) {
          const after = remaining.slice(position + 1).trim();
          if (after !== "" && !after.startsWith("#")) return null;
          closed = true;
          break;
        } else {
          value += char;
        }
      }
      if (closed) break;
      index++;
      if (index >= lines.length) return null;
      value += "\n";
      remaining = lines[index];
    }
    envVariables[key] = value;
  }

  return Object.keys(envVariables).length > 0 ? envVariables : null;
}
