import net from "node:net";
import { Client, type Server, ServerCredentials, credentials, status } from "@grpc/grpc-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CREDENTIALS_METHOD,
  GET_SECRET_METHOD,
  HEALTH_CHECK_METHOD,
  createBuildSessionServer,
  openBuildSession,
} from "./build-session";
import type Docker from "dockerode";

const passBuffer = (buffer: Buffer) => buffer;

function call(client: Client, method: string, request: Buffer) {
  return new Promise<Buffer>((resolve, reject) => {
    client.makeUnaryRequest(method, passBuffer, passBuffer, request, (error, response) => {
      if (error) return reject(error);
      resolve(response ?? Buffer.alloc(0));
    });
  });
}

const secretRequest = (id: string) => Buffer.concat([Buffer.from([0x0A, id.length]), Buffer.from(id)]);

const longValue = "ü".repeat(200);

describe("createBuildSessionServer", () => {
  let server: Server;
  let client: Client;

  beforeEach(async () => {
    server = createBuildSessionServer({ TOKEN: "hunter2", LONG: longValue, EMPTY: "" });
    const port = await new Promise<number>((resolve, reject) => {
      server.bindAsync("127.0.0.1:0", ServerCredentials.createInsecure(), (error, boundPort) => {
        if (error) return reject(error);
        resolve(boundPort);
      });
    });
    client = new Client(`127.0.0.1:${port}`, credentials.createInsecure());
  });

  afterEach(() => {
    client.close();
    server.forceShutdown();
  });

  it("should serve secrets", async () => {
    expect(await call(client, GET_SECRET_METHOD, secretRequest("TOKEN")))
      .toEqual(Buffer.concat([Buffer.from([0x0A, 7]), Buffer.from("hunter2")]));
    // 400 bytes, the length takes two bytes
    expect(await call(client, GET_SECRET_METHOD, secretRequest("LONG")))
      .toEqual(Buffer.concat([Buffer.from([0x0A, 0x90, 0x03]), Buffer.from(longValue)]));
    expect(await call(client, GET_SECRET_METHOD, secretRequest("EMPTY"))).toEqual(Buffer.from([0x0A, 0]));
  });

  it("should report unknown secrets as not found", async () => {
    await expect(call(client, GET_SECRET_METHOD, secretRequest("toString")))
      .rejects.toMatchObject({ code: status.NOT_FOUND });
  });

  it("should answer health checks and credential requests", async () => {
    expect(await call(client, HEALTH_CHECK_METHOD, Buffer.alloc(0))).toEqual(Buffer.from([8, 1]));
    expect(await call(client, CREDENTIALS_METHOD, Buffer.alloc(0))).toEqual(Buffer.alloc(0));
  });
});

describe("openBuildSession", () => {
  it("should open a hijacked connection and close it", async () => {
    const socket = new net.Socket();
    const dial = vi.fn((_options: unknown, callback: (error: Error | null, socket?: unknown) => void) => {
      callback(null, socket);
    });
    const session = await openBuildSession({ dial } as unknown as Docker["modem"], {});
    expect(dial.mock.calls[0][0]).toMatchObject({
      path: "/session",
      hijack: true,
      headers: { "Upgrade": "h2c", "X-Docker-Expose-Session-Uuid": session.id },
    });
    session.close();
    expect(socket.destroyed).toBe(true);
  });

  it("should fail if the connection cannot be opened", async () => {
    const dial = (_options: unknown, callback: (error: Error | null) => void) => callback(new Error("no docker"));
    await expect(openBuildSession({ dial } as unknown as Docker["modem"], {})).rejects.toThrow("no docker");
  });
});
