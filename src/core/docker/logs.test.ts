import { PassThrough } from "node:stream";
import { describe, expect, it, vi } from "vitest";
import { type LogLine, LogParser, isContainerRunning, parseTimestamp, readContainerLogs } from "./logs";
import type Docker from "dockerode";

function frame(type: 1 | 2, content: Buffer | string) {
  const payload = Buffer.from(content);
  const header = Buffer.alloc(8);
  header[0] = type;
  header.writeUInt32BE(payload.length, 4);
  return Buffer.concat([header, payload]);
}

function mockContainer(output: PassThrough, hasTty = true) {
  const logs = vi.fn().mockResolvedValue(output);
  const inspect = vi.fn().mockResolvedValue({ Config: { Tty: hasTty }, State: { Running: true } });
  return { container: { logs, inspect } as unknown as Docker.Container, logs };
}

async function collect(batches: AsyncGenerator<LogLine[], void>) {
  const lines: LogLine[] = [];
  for await (const batch of batches) lines.push(...batch);
  return lines;
}

describe("LogParser", () => {
  it("should parse the timestamps of a raw stream", () => {
    const parser = new LogParser(true);
    expect(parser.push(Buffer.from("2026-11-24T10:00:00.000000001Z hello world\r\n"))).toEqual([
      { stream: "stdout", timestamp: "2026-11-24T10:00:00.000000001Z", text: "hello world" },
    ]);
  });

  it("should strip terminal escape sequences and keep plain brackets", () => {
    const parser = new LogParser(true);
    const lines = parser.push(Buffer.from("\u001b[32m✓\u001b[39m Ready\r\n[info] listening on [::]:3000\n"));
    expect(lines.map(line => line.text)).toEqual(["✓ Ready", "[info] listening on [::]:3000"]);
  });

  it("should only keep what's visible after carriage returns", () => {
    const parser = new LogParser(true);
    expect(parser.push(Buffer.from("10%\r50%\r100%\r\n"))[0].text).toBe("100%");
  });

  it("should tell stdout and stderr apart", () => {
    const parser = new LogParser(false);
    expect(parser.push(Buffer.concat([frame(1, "fine\n"), frame(2, "broken\n")]))).toEqual([
      { stream: "stdout", timestamp: null, text: "fine" },
      { stream: "stderr", timestamp: null, text: "broken" },
    ]);
  });

  it("should handle frames and characters that are split between chunks", () => {
    const parser = new LogParser(false);
    const content = Buffer.from("çay\n");
    const bytes = Buffer.concat([frame(1, content.subarray(0, 1)), frame(2, "x\n"), frame(1, content.subarray(1))]);
    const lines = Array.from(bytes).flatMap(byte => parser.push(Buffer.from([byte])));
    expect(lines.map(line => [line.stream, line.text])).toEqual([["stderr", "x"], ["stdout", "çay"]]);
  });

  it("should return the unfinished lines when it's flushed", () => {
    const parser = new LogParser(true);
    expect(parser.push(Buffer.from("no newline"))).toEqual([]);
    expect(parser.flush().map(line => line.text)).toEqual(["no newline"]);
    expect(parser.flush()).toEqual([]);
  });
});

describe("parseTimestamp", () => {
  it("should keep the nanoseconds", () => {
    const first = parseTimestamp("2026-11-24T10:00:00.100000001Z");
    const second = parseTimestamp("2026-11-24T10:00:00.100000002Z");
    expect(second).toBe((first ?? BigInt(0)) + BigInt(1));
  });

  it("should treat the same moment in different forms as equal", () => {
    const expected = parseTimestamp("2026-11-24T10:00:00.500000000Z");
    expect(parseTimestamp("2026-11-24T10:00:00.5Z")).toBe(expected);
    expect(parseTimestamp("2026-11-24T13:00:00.5+03:00")).toBe(expected);
  });

  it("should return null for anything else", () => {
    expect(parseTimestamp("2026-11-24")).toBeNull();
    expect(parseTimestamp("nonsense")).toBeNull();
    expect(parseTimestamp("2026-13-45T10:00:00Z")).toBeNull();
  });
});

describe("readContainerLogs", () => {
  it("should read until the output ends", async () => {
    const output = new PassThrough();
    const { container, logs } = mockContainer(output);
    output.end("first\nsecond");
    const lines = await collect(readContainerLogs(container, { tail: 10, signal: new AbortController().signal }));
    expect(lines.map(line => line.text)).toEqual(["first", "second"]);
    expect(logs).toHaveBeenCalledWith(expect.objectContaining({ follow: true, timestamps: true, tail: 10 }));
    expect(logs).toHaveBeenCalledWith(expect.not.objectContaining({ since: expect.anything() as unknown }));
  });

  it("should skip the lines that are already known", async () => {
    const output = new PassThrough();
    const { container, logs } = mockContainer(output);
    output.end("2026-11-24T10:00:00.100000000Z old\n2026-11-24T10:00:00.200000000Z new\n");
    const since = "2026-11-24T10:00:00.100000000Z";
    const lines = await collect(readContainerLogs(container, { tail: 10, since, signal: new AbortController().signal }));
    expect(lines.map(line => line.text)).toEqual(["new"]);
    expect(logs).toHaveBeenCalledWith(expect.objectContaining({ since: Date.parse("2026-11-24T10:00:00Z") / 1000 }));
  });

  it.each([
    "2026-11-24T10:00:00Z",
    "2026-11-24T13:00:00+03:00",
  ])("should compare the lines with %s as a moment in time", async since => {
    const output = new PassThrough();
    const { container } = mockContainer(output);
    output.end("2026-11-24T10:00:00.000000000Z old\n2026-11-24T10:00:00.100000000Z new\n");
    const lines = await collect(readContainerLogs(container, { tail: 10, since, signal: new AbortController().signal }));
    expect(lines.map(line => line.text)).toEqual(["new"]);
  });

  it("should close the output when it's aborted", async () => {
    const output = new PassThrough();
    const { container } = mockContainer(output);
    const controller = new AbortController();
    const batches = readContainerLogs(container, { tail: 10, signal: controller.signal });
    output.write("first\n");
    await batches.next();
    const pending = batches.next();
    controller.abort();
    await expect(pending).resolves.toEqual({ done: true, value: undefined });
    expect(output.destroyed).toBe(true);
  });

  it("should throw when the output fails", async () => {
    const output = new PassThrough();
    const { container } = mockContainer(output);
    const pending = collect(readContainerLogs(container, { tail: 10, signal: new AbortController().signal }));
    setImmediate(() => output.destroy(new Error("connection lost")));
    await expect(pending).rejects.toThrow("connection lost");
  });
});

describe("isContainerRunning", () => {
  it("should return the state of the container", async () => {
    await expect(isContainerRunning(mockContainer(new PassThrough()).container)).resolves.toBe(true);
  });

  it("should return false when the container is gone", async () => {
    const container = { inspect: vi.fn().mockRejectedValue(new Error("no such container")) };
    await expect(isContainerRunning(container as unknown as Docker.Container)).resolves.toBe(false);
  });
});
