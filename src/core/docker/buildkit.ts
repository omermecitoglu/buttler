// Minimal decoder for BuildKit progress events.
//
// When an image is built with BuildKit, Docker reports the progress as base64
// encoded protobuf messages (moby.buildkit.v1.StatusResponse). Only the fields
// needed for a readable build log are decoded here:
// https://github.com/moby/buildkit/blob/master/api/services/control/control.proto

const BUILDKIT_TRACE_ID = "moby.buildkit.trace";

export type BuildProgressEvent = {
  id?: string,
  aux?: unknown,
  stream?: string,
  error?: string,
  errorDetail?: { message?: string },
};

type Field = {
  number: number,
  bytes: Buffer,
  value: number,
};

const EMPTY = Buffer.alloc(0);

function readVarint(buffer: Buffer, start: number) {
  let value = 0;
  let multiplier = 1;
  let offset = start;
  while (offset < buffer.length) {
    const byte = buffer[offset++];
    value += (byte & 0x7F) * multiplier;
    if (byte < 0x80) return { value, offset };
    multiplier *= 0x80;
  }
  throw new Error("Unexpected end of protobuf message");
}

function readFields(buffer: Buffer): Field[] {
  const fields: Field[] = [];
  let offset = 0;
  while (offset < buffer.length) {
    const tag = readVarint(buffer, offset);
    offset = tag.offset;
    const number = Math.floor(tag.value / 8);
    switch (tag.value % 8) {
      case 0: {
        const varint = readVarint(buffer, offset);
        offset = varint.offset;
        fields.push({ number, bytes: EMPTY, value: varint.value });
        break;
      }
      case 1:
        offset += 8;
        break;
      case 2: {
        const length = readVarint(buffer, offset);
        offset = length.offset + length.value;
        fields.push({ number, bytes: buffer.subarray(length.offset, offset), value: 0 });
        break;
      }
      case 5:
        offset += 4;
        break;
      default:
        throw new Error("Unsupported protobuf wire type");
    }
  }
  return fields;
}

function formatVertex(bytes: Buffer) {
  const fields = readFields(bytes);
  const name = fields.find(f => f.number === 3)?.bytes.toString("utf-8") ?? "";
  const cached = fields.some(f => f.number === 4 && f.value === 1);
  const started = fields.some(f => f.number === 5);
  const completed = fields.some(f => f.number === 6);
  const error = fields.find(f => f.number === 7)?.bytes.toString("utf-8");
  if (error) return `ERROR ${name}: ${error}\n`;
  if (cached) return `CACHED ${name}\n`;
  if (completed) return `DONE ${name}\n`;
  if (started) return `=> ${name}\n`;
  return "";
}

function formatLog(bytes: Buffer) {
  return readFields(bytes).find(f => f.number === 4)?.bytes.toString("utf-8") ?? "";
}

export function decodeBuildKitTrace(trace: string): string {
  try {
    return readFields(Buffer.from(trace, "base64")).map(field => {
      switch (field.number) {
        case 1:
          return formatVertex(field.bytes);
        case 3:
          return formatLog(field.bytes);
        default:
          return "";
      }
    }).join("");
  } catch {
    // The log is informative only, an unreadable event must not break the build
    return "";
  }
}

export function formatBuildProgress(event: BuildProgressEvent): string {
  if (event.error) {
    return `ERROR ${event.errorDetail?.message ?? event.error}\n`;
  }
  if (event.id === BUILDKIT_TRACE_ID && typeof event.aux === "string") {
    return decodeBuildKitTrace(event.aux);
  }
  return event.stream ?? "";
}
