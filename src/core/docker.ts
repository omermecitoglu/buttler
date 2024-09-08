import path from "node:path";
import Docker from "dockerode";
import tar from "tar-fs";
import { deleteRepo } from "./git";

const docker = new Docker();

type FixedReadableStream = NodeJS.ReadableStream & { destroy: (reason: unknown) => Promise<void> };

const streams = {} as Record<string, FixedReadableStream>;

export function buildImage(imageId: string, repoPath: string, log: boolean) {
  const dockerfilePath = path.join(repoPath, "Dockerfile");
  const tarStream = tar.pack(path.dirname(dockerfilePath));

  return new Promise<boolean>((resolve, reject) => {
    docker.buildImage(tarStream, { t: `${imageId}:latest` }, (err, stream) => {
      if (err) return reject(err);
      if (!stream) return reject(new Error("no stream"));
      // stream.pipe(process.stdout, { end: true });
      stream.on("data", buffer => {
        if (!log) return;
        const logData = buffer.toString("utf-8").trim();
        const parsedData = JSON.parse(logData);
        if ("stream" in parsedData) {
          // eslint-disable-next-line no-console
          console.log(parsedData.stream.slice(0, -1));
        }
      });
      stream.on("end", () => {
        resolve(true);
      });
      stream.on("error", reason => {
        if (reason === "UPDATE") {
          resolve(false);
        } else {
          reject(reason);
        }
      });
      streams[imageId] = stream as unknown as FixedReadableStream;
    });
  });
}

async function cancelBuild(serviceId: string, imageId: string) {
  const stream = streams[imageId];
  await stream.destroy("UPDATE");
  delete streams[imageId];
  await deleteRepo(serviceId);
}

export async function removeImage(imageId: string) {
  const image = docker.getImage(imageId);
  await image.remove();
}

export async function createContainer(
  serviceName: string,
  imageId: string,
  env: Record<string, string>,
  ports: Record<string, string>
) {
  const container = await docker.createContainer({
    name: serviceName,
    Image: imageId,
    Env: Object.entries(env).map(([key, value]) => `${key}=${value}`),
    HostConfig: {
      PortBindings: Object.fromEntries(Object.entries(ports).map(([external, internal]) => {
        return [`${internal}/tcp`, [{ HostPort: external }]];
      })),
      RestartPolicy: {
        Name: "always",
      },
    },
  });
  await container.start();
  return container.id;
}

export async function removeContainer(containerId: string) {
  await docker.getContainer(containerId).remove({ force: true });
}

export function getContainerLogs(containerId: string, limit: number) {
  const container = docker.getContainer(containerId);
  return new Promise<string>((resolve, reject) => {
    container.logs({ follow: false, stdout: true, stderr: true, tail: limit }, (err, buffer) => {
      if (err) return reject(err);
      if (!buffer) return reject(new Error("stream is undefined"));
      resolve(demux(buffer));
    });
  });
}

function demux(chunk: Buffer): string {
  const output: string[] = [];
  let offset = 0;

  while (offset < chunk.length) {
    // Check if there are enough bytes to read the header
    if (offset + 8 > chunk.length) {
      break;
    }

    // Read the first 8 bytes for the header
    // const streamType = chunk.readUInt8(offset);
    const size = chunk.readUInt32BE(offset + 4); // Read the size of the output

    // Move the offset to the start of the actual output
    offset += 8;

    // Check if there's enough data for the output
    if (offset + size > chunk.length) {
      break;
    }

    // Extract the output based on the size
    const outputChunk = chunk.slice(offset, offset + size).toString();
    output.push(outputChunk);

    // Move the offset to the end of the current output
    offset += size;
  }

  return output.join("");
}
