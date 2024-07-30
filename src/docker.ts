import path from "node:path";
import Docker from "dockerode";
import tar from "tar-fs";
import { type Service, deleteRepo } from "./services.js";

const docker = new Docker();

type FixedReadableStream = NodeJS.ReadableStream & { destroy: (reason: unknown) => Promise<void> };

const streams = {} as Record<string, FixedReadableStream>;

export function buildImage(imageId: string, repoPath: string) {
  const dockerfilePath = path.join(repoPath, "Dockerfile");
  // Create a tar stream of the directory containing the Dockerfile
  const tarStream = tar.pack(path.dirname(dockerfilePath));

  return new Promise<boolean>((resolve, reject) => {
    docker.buildImage(tarStream, { t: `${imageId}:latest` }, (err, stream) => {
      if (err) return reject(err);
      if (!stream) return reject(new Error("no stream"));
      // stream.pipe(process.stdout, { end: true });
      stream.on("data", () => null);
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

export async function createContainer(service: Service) {
  const container = await docker.createContainer({
    name: service.name,
    Image: service.imageId,
    Env: Object.entries(service.env).map(([key, value]) => `${key}=${value}`),
    HostConfig: {
      PortBindings: Object.fromEntries(Object.entries(service.ports).map(([internal, external]) => {
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
