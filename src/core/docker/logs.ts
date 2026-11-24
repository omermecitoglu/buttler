import { addAbortSignal } from "node:stream";
import { stripVTControlCharacters } from "node:util";
import type Docker from "dockerode";

export type LogStreamName = "stdout" | "stderr";

export type LogLine = {
  stream: LogStreamName,
  /** RFC 3339 with nanoseconds, fixed width, so it can be compared as text */
  timestamp: string | null,
  text: string,
};

export type ReadContainerLogsOptions = {
  /** Number of the past lines to begin with */
  tail: number,
  /** Timestamp of the last known line, only newer lines are returned */
  since?: string | null,
  signal: AbortSignal,
};

const FRAME_HEADER_SIZE = 8;
const STDERR_FRAME = 2;
const TIMESTAMP_PATTERN = /^(\d{4}-\d{2}-\d{2}T[\d:.]+(?:Z|[+-]\d{2}:\d{2})) ?/;

function parseLine(stream: LogStreamName, rawLine: string): LogLine {
  const timestamp = TIMESTAMP_PATTERN.exec(rawLine);
  const content = timestamp ? rawLine.slice(timestamp[0].length) : rawLine;
  // A carriage return moves the cursor back to the beginning, what's written before it is not visible
  const visible = content.replace(/\r+$/, "").split("\r").at(-1) ?? "";
  return {
    stream,
    timestamp: timestamp ? timestamp[1] : null,
    text: stripVTControlCharacters(visible),
  };
}

class LineSplitter {
  private readonly decoder = new TextDecoder();
  private rest = "";

  constructor(private readonly stream: LogStreamName) {}

  push(chunk: Uint8Array): LogLine[] {
    const lines = (this.rest + this.decoder.decode(chunk, { stream: true })).split("\n");
    this.rest = lines.pop() ?? "";
    return lines.map(line => parseLine(this.stream, line));
  }

  flush(): LogLine[] {
    const line = this.rest + this.decoder.decode();
    this.rest = "";
    return line ? [parseLine(this.stream, line)] : [];
  }
}

/**
 * Docker multiplexes stdout and stderr as frames, unless the container has a TTY. Then there is
 * only a raw stream, which is treated as stdout.
 */
export class LogParser {
  private readonly stdout = new LineSplitter("stdout");
  private readonly stderr = new LineSplitter("stderr");
  private pending = Buffer.alloc(0);

  constructor(private readonly hasTty: boolean) {}

  push(chunk: Buffer): LogLine[] {
    if (this.hasTty) return this.stdout.push(chunk);

    const lines: LogLine[] = [];
    let buffer = Buffer.concat([this.pending, chunk]);
    while (buffer.length >= FRAME_HEADER_SIZE) {
      const end = FRAME_HEADER_SIZE + buffer.readUInt32BE(4);
      if (buffer.length < end) break;
      const splitter = buffer[0] === STDERR_FRAME ? this.stderr : this.stdout;
      lines.push(...splitter.push(buffer.subarray(FRAME_HEADER_SIZE, end)));
      buffer = buffer.subarray(end);
    }
    this.pending = buffer;
    return lines;
  }

  flush(): LogLine[] {
    return [...this.stdout.flush(), ...this.stderr.flush()];
  }
}

/** Follows the logs until the container stops or the signal is aborted. Batches are never empty. */
export async function * readContainerLogs(
  container: Docker.Container,
  { tail, since, signal }: ReadContainerLogsOptions,
): AsyncGenerator<LogLine[], void> {
  const { Config: config } = await container.inspect();
  const output = await container.logs({
    follow: true,
    stdout: true,
    stderr: true,
    timestamps: true,
    tail,
    // It has a precision of seconds here, the rest is filtered below
    ...since ? { since: Math.floor(Date.parse(since) / 1000) } : {},
  });
  addAbortSignal(signal, output);

  const isNew = (line: LogLine) => !since || !line.timestamp || line.timestamp > since;
  const parser = new LogParser(config.Tty);
  try {
    for await (const chunk of output) {
      const lines = parser.push(chunk as Buffer).filter(isNew);
      if (lines.length > 0) yield lines;
    }
  } catch (error) {
    if (signal.aborted) return;
    throw error;
  }
  const lastLines = parser.flush().filter(isNew);
  if (lastLines.length > 0) yield lastLines;
}

export async function isContainerRunning(container: Docker.Container) {
  try {
    const { State: state } = await container.inspect();
    return state.Running;
  } catch {
    return false;
  }
}
