import { describe, expect, it } from "vitest";
import { decodeBuildKitTrace, formatBuildProgress } from "./buildkit";

function field(number: number, content: string | Buffer) {
  const bytes = Buffer.from(content);
  const length = bytes.length < 0x80
    ? [bytes.length]
    : [(bytes.length & 0x7F) | 0x80, bytes.length >> 7];
  return Buffer.concat([Buffer.from([(number * 8) + 2, ...length]), bytes]);
}

const digest = field(1, "sha256:abc");
const name = field(3, "[1/2] FROM node");
const cached = Buffer.from([4 * 8, 1]);
const started = field(5, Buffer.from([8, 1]));
const completed = field(6, Buffer.from([8, 2]));

const vertex = (...fields: Buffer[]) => field(1, Buffer.concat(fields)).toString("base64");

describe("decodeBuildKitTrace", () => {
  it("should format the state of build steps", () => {
    expect(decodeBuildKitTrace(vertex(digest, name))).toBe("");
    expect(decodeBuildKitTrace(vertex(digest, name, started))).toBe("=> [1/2] FROM node\n");
    expect(decodeBuildKitTrace(vertex(digest, name, started, completed))).toBe("DONE [1/2] FROM node\n");
    expect(decodeBuildKitTrace(vertex(digest, name, cached, started, completed))).toBe("CACHED [1/2] FROM node\n");
    expect(decodeBuildKitTrace(vertex(digest, name, started, completed, field(7, "exit code: 1"))))
      .toBe("ERROR [1/2] FROM node: exit code: 1\n");
  });

  it("should extract multi-byte and long log messages", () => {
    const message = `${"x".repeat(200)} ✓\n`;
    const log = field(3, Buffer.concat([digest, Buffer.from([3 * 8, 1]), field(4, message)]));
    expect(decodeBuildKitTrace(log.toString("base64"))).toBe(message);
  });

  it("should ignore unreadable events", () => {
    expect(decodeBuildKitTrace(Buffer.from([0xFF, 0xFF]).toString("base64"))).toBe("");
  });
});

describe("formatBuildProgress", () => {
  it("should format errors, traces and plain streams", () => {
    expect(formatBuildProgress({ error: "failed", errorDetail: { message: "failed to solve" } }))
      .toBe("ERROR failed to solve\n");
    expect(formatBuildProgress({ id: "moby.buildkit.trace", aux: vertex(digest, name, started) }))
      .toBe("=> [1/2] FROM node\n");
    expect(formatBuildProgress({ stream: "Step 1" })).toBe("Step 1");
    expect(formatBuildProgress({ id: "moby.image.id", aux: { ID: "sha256:abc" } })).toBe("");
  });
});
