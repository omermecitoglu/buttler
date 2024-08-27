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

export async function cancelBuild(serviceId: string, imageId: string) {
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
    },
  });
  await container.start();
  return container.id;
}

export async function removeContainer(containerId: string) {
  await docker.getContainer(containerId).remove({ force: true });
}
