// BuildKit session that serves the secrets of a build.
//
// BuildKit calls back the client over a hijacked connection whenever it needs
// something, e.g. the value of a secret mount. The session of Dockerode only
// implements registry authentication, and it doesn't answer health checks.
// https://github.com/moby/buildkit/blob/master/session/secrets/secrets.proto
// https://github.com/moby/buildkit/blob/master/session/auth/auth.proto

import crypto from "node:crypto";
import { Server, ServerCredentials, type ServerUnaryCall, type ServiceDefinition, type UntypedHandleCall, type sendUnaryData, status } from "@grpc/grpc-js";
import { readFields } from "./buildkit";
import type Docker from "dockerode";
import type { Duplex } from "node:stream";

const EMPTY = Buffer.alloc(0);
const HEALTH_SERVING = Buffer.from([0x08, 0x01]);

export const GET_SECRET_METHOD = "/moby.buildkit.secrets.v1.Secrets/GetSecret";
export const CREDENTIALS_METHOD = "/moby.filesync.v1.Auth/Credentials";
export const HEALTH_CHECK_METHOD = "/grpc.health.v1.Health/Check";

const passBuffer = (buffer: Buffer) => buffer;

function defineUnaryMethod(methodPath: string): ServiceDefinition[string] {
  return {
    path: methodPath,
    requestStream: false,
    responseStream: false,
    requestSerialize: passBuffer,
    requestDeserialize: passBuffer,
    responseSerialize: passBuffer,
    responseDeserialize: passBuffer,
  };
}

function encodeVarint(value: number) {
  const bytes: number[] = [];
  let rest = value;
  while (rest >= 0x80) {
    bytes.push((rest % 0x80) | 0x80);
    rest = Math.floor(rest / 0x80);
  }
  bytes.push(rest);
  return Buffer.from(bytes);
}

function encodeSecretResponse(value: string) {
  const data = Buffer.from(value, "utf-8");
  return Buffer.concat([Buffer.from([0x0A]), encodeVarint(data.length), data]);
}

export function createBuildSessionServer(secrets: Record<string, string>) {
  const values = new Map(Object.entries(secrets));
  const server = new Server();
  const addMethod = (methodPath: string, handler: (request: Buffer) => Buffer | null) => {
    const handleCall = (call: ServerUnaryCall<Buffer, Buffer>, callback: sendUnaryData<Buffer>) => {
      const response = handler(call.request);
      if (response) return callback(null, response);
      // BuildKit skips optional secrets that are not found, and fails for the required ones
      callback({ code: status.NOT_FOUND, details: "not found" });
    };
    server.addService({ call: defineUnaryMethod(methodPath) }, { call: handleCall as UntypedHandleCall });
  };

  addMethod(GET_SECRET_METHOD, request => {
    const id = readFields(request).find(f => f.number === 1)?.bytes.toString("utf-8") ?? "";
    const value = values.get(id);
    return value === undefined ? null : encodeSecretResponse(value);
  });
  // Base images are pulled anonymously
  addMethod(CREDENTIALS_METHOD, () => EMPTY);
  // BuildKit drops the sessions that don't pass its health checks
  addMethod(HEALTH_CHECK_METHOD, () => HEALTH_SERVING);
  return server;
}

/** Opens a session that has to be closed when the build is done */
export async function openBuildSession(modem: Docker["modem"], secrets: Record<string, string>) {
  const id = crypto.randomUUID();
  const socket = await new Promise<Duplex>((resolve, reject) => {
    modem.dial({
      method: "POST",
      path: "/session",
      hijack: true,
      headers: {
        "Upgrade": "h2c",
        "X-Docker-Expose-Session-Uuid": id,
        "X-Docker-Expose-Session-Name": "buttler",
        "X-Docker-Expose-Session-Grpc-Method": [GET_SECRET_METHOD, CREDENTIALS_METHOD],
      },
      statusCodes: {
        200: true,
        500: "server error",
      },
    }, (error: Error | null, connection?: unknown) => {
      if (error) return reject(error);
      resolve(connection as Duplex);
    });
  });
  // The build fails on its own if the connection is lost
  socket.on("error", () => undefined);
  const server = createBuildSessionServer(secrets);
  server.createConnectionInjector(ServerCredentials.createInsecure()).injectConnection(socket);
  return {
    id,
    close: () => {
      server.forceShutdown();
      socket.destroy();
    },
  };
}
