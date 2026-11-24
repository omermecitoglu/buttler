// Reads the build history of BuildKit.
//
// Docker keeps the recent builds for a while, including the failed ones and the
// ones that are still running. They can only be reached through the gRPC API of
// BuildKit, which Docker serves over a hijacked connection:
// https://github.com/moby/buildkit/blob/master/api/services/control/control.proto

import http2 from "node:http2";
import { readFields } from "./buildkit";
import type Docker from "dockerode";
import type { Duplex } from "node:stream";

export const LISTEN_BUILD_HISTORY_METHOD = "/moby.buildkit.v1.Control/ListenBuildHistory";

const REQUEST_TIMEOUT = 5000;
const MESSAGE_HEADER_LENGTH = 5;
const EVENT_DELETED = 2;

// BuildHistoryRequest { EarlyExit: true }, without it the stream stays open for new builds
const LIST_REQUEST = Buffer.from([0x18, 0x01]);

export type BuildRecord = {
  ref: string,
  /** Labels that are requested for the image */
  labels: Record<string, string>,
  createdAt: Date | null,
  /** It's null as long as the build is running */
  completedAt: Date | null,
  error: string | null,
};

const LABEL_PREFIX = "label:";

function decodeTimestamp(bytes: Buffer) {
  const fields = readFields(bytes);
  const seconds = fields.find(f => f.number === 1)?.value ?? 0;
  const nanos = fields.find(f => f.number === 2)?.value ?? 0;
  return new Date((seconds * 1000) + Math.floor(nanos / 1e6));
}

function decodeRecord(bytes: Buffer): BuildRecord {
  const fields = readFields(bytes);
  const findBytes = (number: number) => fields.find(f => f.number === number)?.bytes;
  const labels: Record<string, string> = {};
  for (const { bytes: entry } of fields.filter(f => f.number === 3)) {
    const entryFields = readFields(entry);
    const key = entryFields.find(f => f.number === 1)?.bytes.toString("utf-8") ?? "";
    if (!key.startsWith(LABEL_PREFIX)) continue;
    labels[key.slice(LABEL_PREFIX.length)] = entryFields.find(f => f.number === 2)?.bytes.toString("utf-8") ?? "";
  }
  const error = findBytes(5);
  const createdAt = findBytes(6);
  const completedAt = findBytes(7);
  return {
    ref: findBytes(1)?.toString("utf-8") ?? "",
    labels,
    createdAt: createdAt ? decodeTimestamp(createdAt) : null,
    completedAt: completedAt ? decodeTimestamp(completedAt) : null,
    error: error ? readFields(error).find(f => f.number === 2)?.bytes.toString("utf-8") ?? "" : null,
  };
}

export function decodeBuildHistory(events: Buffer[]): BuildRecord[] {
  const records = new Map<string, BuildRecord>();
  for (const event of events) {
    const fields = readFields(event);
    const bytes = fields.find(f => f.number === 2)?.bytes;
    if (!bytes) continue;
    const record = decodeRecord(bytes);
    if (fields.find(f => f.number === 1)?.value === EVENT_DELETED) {
      records.delete(record.ref);
    } else {
      records.set(record.ref, record);
    }
  }
  return [...records.values()];
}

function encodeMessage(payload: Buffer) {
  const header = Buffer.alloc(MESSAGE_HEADER_LENGTH);
  header.writeUInt32BE(payload.length, 1);
  return Buffer.concat([header, payload]);
}

function splitMessages(data: Buffer) {
  const messages: Buffer[] = [];
  let offset = 0;
  while (offset + MESSAGE_HEADER_LENGTH <= data.length) {
    const start = offset + MESSAGE_HEADER_LENGTH;
    offset = start + data.readUInt32BE(offset + 1);
    messages.push(data.subarray(start, offset));
  }
  return messages;
}

/** gRPC messages are percent-encoded */
function decodeErrorMessage(message: string) {
  try {
    return decodeURIComponent(message);
  } catch {
    return message;
  }
}

function openConnection(modem: Docker["modem"]) {
  return new Promise<Duplex>((resolve, reject) => {
    modem.dial({
      method: "POST",
      path: "/grpc",
      hijack: true,
      headers: { Upgrade: "h2c" },
      statusCodes: {
        200: true,
        500: "server error",
      },
    }, (error: Error | null, connection?: unknown) => {
      if (error) return reject(error);
      resolve(connection as Duplex);
    });
  });
}

function requestMessages(session: http2.ClientHttp2Session, method: string, payload: Buffer) {
  return new Promise<Buffer[]>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let status: string | undefined;
    let message: string | undefined;
    const readStatus = (headers: http2.IncomingHttpHeaders) => {
      status = headers["grpc-status"]?.toString() ?? status;
      message = headers["grpc-message"] ? decodeErrorMessage(headers["grpc-message"].toString()) : message;
    };
    session.on("error", reject);
    const stream = session.request({
      ":method": "POST",
      ":path": method,
      "content-type": "application/grpc",
      "te": "trailers",
    });
    stream.setTimeout(REQUEST_TIMEOUT, () => {
      stream.destroy(new Error("Docker did not return the build history in time"));
    });
    stream.on("error", reject);
    // The status is in the headers when there are no messages
    stream.on("response", readStatus);
    stream.on("trailers", readStatus);
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("close", () => {
      if (status === "0") return resolve(splitMessages(Buffer.concat(chunks)));
      reject(new Error(`Failed to read the build history: ${message ?? `status ${status ?? "unknown"}`}`));
    });
    stream.end(encodeMessage(payload));
  });
}

/** Returns the builds that are known by BuildKit, in no particular order */
export async function listBuildRecords(modem: Docker["modem"]): Promise<BuildRecord[]> {
  const socket = await openConnection(modem);
  const session = http2.connect("http://docker", { createConnection: () => socket });
  try {
    return decodeBuildHistory(await requestMessages(session, LISTEN_BUILD_HISTORY_METHOD, LIST_REQUEST));
  } finally {
    session.destroy();
    socket.destroy();
  }
}
