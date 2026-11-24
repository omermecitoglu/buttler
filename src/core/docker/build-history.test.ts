import net, { type AddressInfo } from "node:net";
import { Server, ServerCredentials, type ServerWritableStream, status } from "@grpc/grpc-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LISTEN_BUILD_HISTORY_METHOD, decodeBuildHistory, listBuildRecords } from "./build-history";
import type Docker from "dockerode";

function varint(value: number) {
  const bytes: number[] = [];
  let rest = value;
  while (rest >= 0x80) {
    bytes.push((rest % 0x80) | 0x80);
    rest = Math.floor(rest / 0x80);
  }
  return Buffer.from([...bytes, rest]);
}

const number = (id: number, value: number) => Buffer.concat([varint(id * 8), varint(value)]);

function field(id: number, ...parts: (string | Buffer)[]) {
  const bytes = Buffer.concat(parts.map(part => Buffer.from(part)));
  return Buffer.concat([varint((id * 8) + 2), varint(bytes.length), bytes]);
}

const attr = (key: string, value: string) => field(3, field(1, key), field(2, value));

const timestamp = (id: number, seconds: number, nanos = 0) => field(id, number(1, seconds), number(2, nanos));

const event = (type: number, ...record: Buffer[]) => Buffer.concat([
  ...(type ? [number(1, type)] : []),
  field(2, ...record),
]);

const failed = event(
  1,
  field(1, "ref-1"),
  field(2, "dockerfile.v0"),
  attr("label:buttler.service-id", "srv"),
  attr("build-arg:NODE_ENV", "production"),
  field(5, number(1, 2), field(2, "exit code: 1")),
  timestamp(6, 1_790_000_000, 500_000_000),
  timestamp(7, 1_790_000_060),
);

const active = event(0, field(1, "ref-2"), attr("label:buttler.service-id", "srv"), timestamp(6, 1_790_000_100));

describe("decodeBuildHistory", () => {
  it("should decode failed and active builds", () => {
    expect(decodeBuildHistory([failed, active])).toEqual([
      {
        ref: "ref-1",
        labels: { "buttler.service-id": "srv" },
        createdAt: new Date(1_790_000_000_500),
        completedAt: new Date(1_790_000_060_000),
        error: "exit code: 1",
      },
      {
        ref: "ref-2",
        labels: { "buttler.service-id": "srv" },
        createdAt: new Date(1_790_000_100_000),
        completedAt: null,
        error: null,
      },
    ]);
  });

  it("should keep the last state of a build", () => {
    const completed = event(1, field(1, "ref-2"), timestamp(7, 1_790_000_200));
    expect(decodeBuildHistory([active, completed])).toMatchObject([{ completedAt: new Date(1_790_000_200_000) }]);
    expect(decodeBuildHistory([failed, event(2, field(1, "ref-1"))])).toEqual([]);
    expect(decodeBuildHistory([Buffer.alloc(0)])).toEqual([]);
  });
});

describe("listBuildRecords", () => {
  const passBuffer = (buffer: Buffer) => buffer;
  const handler = vi.fn<(call: ServerWritableStream<Buffer, Buffer>) => void>();
  let grpcServer: Server;
  let daemon: net.Server;
  let sockets: net.Socket[];

  const dial = vi.fn((_options: unknown, callback: (error: Error | null, socket?: net.Socket) => void) => {
    const socket = net.connect((daemon.address() as AddressInfo).port, "127.0.0.1", () => callback(null, socket));
    sockets.push(socket);
  });
  const modem = { dial } as unknown as Docker["modem"];

  beforeEach(async () => {
    vi.clearAllMocks();
    sockets = [];
    grpcServer = new Server();
    grpcServer.addService({
      call: {
        path: LISTEN_BUILD_HISTORY_METHOD,
        requestStream: false,
        responseStream: true,
        requestSerialize: passBuffer,
        requestDeserialize: passBuffer,
        responseSerialize: passBuffer,
        responseDeserialize: passBuffer,
      },
    }, { call: handler });
    const injector = grpcServer.createConnectionInjector(ServerCredentials.createInsecure());
    daemon = net.createServer(socket => injector.injectConnection(socket));
    await new Promise<void>(resolve => {
      daemon.listen(0, "127.0.0.1", resolve);
    });
  });

  afterEach(() => {
    grpcServer.forceShutdown();
    daemon.close();
  });

  it("should list the builds over a hijacked connection and close it", async () => {
    handler.mockImplementation(call => {
      call.write(failed);
      call.write(active);
      call.end();
    });
    expect(await listBuildRecords(modem)).toMatchObject([{ ref: "ref-1" }, { ref: "ref-2" }]);
    expect(handler.mock.calls[0][0].request).toEqual(Buffer.from([0x18, 0x01]));
    expect(dial).toHaveBeenCalledWith(expect.objectContaining({
      method: "POST",
      path: "/grpc",
      hijack: true,
      headers: { Upgrade: "h2c" },
    }), expect.any(Function));
    expect(sockets[0].destroyed).toBe(true);
  });

  it("should return nothing when there are no builds", async () => {
    handler.mockImplementation(call => call.end());
    expect(await listBuildRecords(modem)).toEqual([]);
  });

  it("should reject when BuildKit reports an error", async () => {
    handler.mockImplementation(call => {
      call.emit("error", { code: status.UNIMPLEMENTED, details: "not supported" });
    });
    await expect(listBuildRecords(modem)).rejects.toThrow("not supported");
    expect(sockets[0].destroyed).toBe(true);
  });

  it("should reject when the connection is lost", async () => {
    handler.mockImplementation(() => sockets[0].destroy());
    await expect(listBuildRecords(modem)).rejects.toThrow();
  });

  it("should reject when Docker cannot be reached", async () => {
    dial.mockImplementationOnce((_options, callback) => callback(new Error("no such file")));
    await expect(listBuildRecords(modem)).rejects.toThrow("no such file");
  });
});
