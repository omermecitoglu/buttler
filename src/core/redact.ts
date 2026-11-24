const MASK = "***";
const MIN_LINE_LENGTH = 4;

function getNeedles(secrets: string[]) {
  const lines = secrets.flatMap(secret => {
    const parts = secret.split(/\r?\n/).map(line => line.trim());
    // Lines of multi-line secrets are printed one by one, the short ones (e.g. brackets) are not worth hiding
    return parts.length > 1 ? parts.filter(line => line.length >= MIN_LINE_LENGTH) : parts;
  });
  return [...new Set(lines)].filter(Boolean).sort((a, b) => b.length - a.length);
}

/** Creates a writer that hides the secrets in a text, even if they arrive in multiple chunks */
export function createRedactor(secrets: string[], write: (text: string) => void) {
  const needles = getNeedles(secrets);
  const redact = (text: string) => needles.reduce((result, needle) => result.replaceAll(needle, MASK), text);
  let pending = "";
  return {
    redact,
    write: (text: string) => {
      if (!needles.length) return write(text);
      pending += text;
      const end = pending.lastIndexOf("\n") + 1;
      if (!end) return;
      write(redact(pending.slice(0, end)));
      pending = pending.slice(end);
    },
    flush: () => {
      if (pending) write(redact(pending));
      pending = "";
    },
  };
}
