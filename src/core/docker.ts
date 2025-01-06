import path from "node:path";
import Docker from "dockerode";
import tar from "tar-fs";
// import { deleteRepo } from "./git";

const docker = new Docker();

type FixedReadableStream = NodeJS.ReadableStream & { destroy: (reason: unknown) => Promise<void> };

const streams = {} as Record<string, FixedReadableStream>;

export function buildImage(imageId: string, repoPath: string, log: boolean) {
  const dockerfilePath = path.join(repoPath, "Dockerfile");
  const tarStream = tar.pack(path.dirname(dockerfilePath)) as unknown as NodeJS.ReadableStream;

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

/*
async function cancelBuild(serviceId: string, imageId: string) {
  const stream = streams[imageId];
  await stream.destroy("UPDATE");
  delete streams[imageId];
  await deleteRepo(serviceId);
}
*/

export function pullImage(imageName: string) {
  return new Promise<unknown>((resolve, reject) => {
    docker.pull(`${imageName}:latest`, (pullError: Error | null, stream: NodeJS.ReadableStream) => {
      if (pullError) return reject(pullError);
      docker.modem.followProgress(stream, (modemError, res) => {
        if (modemError) return reject(modemError);
        resolve(res);
      });
    });
  });
}

export async function removeImage(imageId: string) {
  try {
    const image = docker.getImage(imageId);
    await image.remove();
  } catch {
    // do nothing
  }
}

export async function createContainer(
  serviceName: string,
  imageId: string,
  env: Record<string, string>,
  ports: Record<string, string>,
  volumes: Record<string, string>,
  networkIds: string[],
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
      Binds: Object.entries(volumes).map(([key, value]) => `${key}:${value}`),
    },
    Tty: true,
  });
  await Promise.all(networkIds.map(networkId => connectContainerToNetwork(container.id, networkId)));
  await container.start();
  return container.id;
}

export async function removeContainer(containerId: string) {
  await docker.getContainer(containerId).remove({ force: true });
}

export function executeCommandInContainer(containerId: string, command: string[]) {
  return new Promise<string>((resolve, reject) => {
    const container = docker.getContainer(containerId);
    container.exec({
      Cmd: command,
      AttachStdout: true,
      AttachStderr: true,
      Tty: true,
    }, (execError, exec) => {
      if (execError || !exec) return reject(execError);
      exec.start({ Tty: true }, (startError, stream) => {
        if (startError || !stream) return reject(startError);
        let output = "";
        stream.on("data", data => {
          output += data.toString();
        });
        stream.on("end", () => {
          resolve(output);
        });
      });
    });
  });
}

export function getContainerLogs(containerId: string, limit: number) {
  const container = docker.getContainer(containerId);
  return new Promise<string>((resolve, reject) => {
    container.logs({ follow: false, stdout: true, stderr: true, tail: limit }, (err, buffer) => {
      if (err) return reject(err);
      if (!buffer) return reject(new Error("stream is undefined"));
      resolve(buffer.toString());
    });
  });
}

export async function createVolume(name: string) {
  await docker.createVolume({
    Name: name,
    Driver: "local",
    /* Labels: {
      app: 'my_app',
    }, */
  });
}

export async function createNetwork(networkId: string) {
  const network = await docker.createNetwork({
    Name: networkId,
    Driver: "bridge",
    CheckDuplicate: true,
    Internal: false,
    Attachable: true,
  });
  return network;
}

export async function destroyNetwork(networkId: string) {
  const network = docker.getNetwork(networkId);
  await network.remove();
}

async function connectContainerToNetwork(containerId: string, networkId: string) {
  const network = docker.getNetwork(networkId);
  await network.connect({
    Container: containerId,
  });
}

/*
async function disconnectContainerFromNetwork(containerId: string, networkId: string) {
  const network = docker.getNetwork(networkId);
  await network.disconnect({
    Container: containerId,
    // Force: true, // is this necessary?
  });
}
*/
