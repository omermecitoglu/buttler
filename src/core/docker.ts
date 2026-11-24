import fs from "node:fs/promises";
import path from "node:path";
import { stripVTControlCharacters } from "node:util";
import ignore from "@balena/dockerignore";
import Docker from "dockerode";
import tar from "tar-fs";
import { openBuildSession } from "./docker/build-session";
import { type BuildProgressEvent, formatBuildProgress } from "./docker/buildkit";

export const docker = new Docker();

export type BuildImageOptions = {
  contextPath: string,
  /** Files to be sent as build context, relative to the context path */
  files: string[],
  repository: string,
  tag: string,
  labels: Record<string, string>,
  /** Can be seen in the image history, must not include secrets */
  buildArgs?: Record<string, string>,
  /** Can only be read by the build steps that mount them */
  secrets?: Record<string, string>,
  onProgress?: (text: string) => void,
};

async function filterIgnoredFiles(contextPath: string, files: string[]) {
  if (!files.includes(".dockerignore")) return files;
  const rules = await fs.readFile(path.join(contextPath, ".dockerignore"), "utf-8");
  const isIncluded = ignore({ ignorecase: false }).add(rules).createFilter();
  // Docker always needs the Dockerfile itself, even if it's listed in .dockerignore
  return files.filter(file => file === "Dockerfile" || isIncluded(file));
}

/** Docker.buildImage() cannot be used here, because it always replaces the session with its own */
function requestBuild(
  context: NodeJS.ReadableStream,
  abortSignal: AbortSignal,
  options: Docker.ImageBuildOptions & { session: string },
) {
  return new Promise<NodeJS.ReadableStream>((resolve, reject) => {
    docker.modem.dial({
      path: "/build?",
      method: "POST",
      file: context,
      options,
      abortSignal,
      isStream: true,
      statusCodes: {
        200: true,
        500: "server error",
      },
    }, (error: Error | null, stream?: unknown) => {
      if (error) return reject(error);
      resolve(stream as NodeJS.ReadableStream);
    });
  });
}

/** Builds an image with BuildKit and returns the ID of it */
export async function buildImage(options: BuildImageOptions): Promise<string> {
  const { contextPath, files, repository, tag, labels, buildArgs = {}, secrets = {}, onProgress } = options;
  if (!files.includes("Dockerfile")) {
    throw new Error("No Dockerfile found at the root of the repository");
  }
  const entries = await filterIgnoredFiles(contextPath, files);
  const session = await openBuildSession(docker.modem, secrets);
  try {
    const context = tar.pack(contextPath, { entries });
    // A broken build context would leave the request open forever
    const abortController = new AbortController();
    context.on("error", error => abortController.abort(error));
    const stream = await requestBuild(context as unknown as NodeJS.ReadableStream, abortController.signal, {
      t: `${repository}:${tag}`,
      labels,
      buildargs: buildArgs,
      version: "2",
      session: session.id,
    });

    await new Promise<void>((resolve, reject) => {
      let buildError: Error | null = null;
      docker.modem.followProgress(stream, (streamError: Error | null) => {
        const error = streamError ?? buildError;
        if (error) return reject(error);
        resolve();
      }, (event: BuildProgressEvent) => {
        if (event.error) {
          buildError = new Error(event.errorDetail?.message ?? event.error);
        }
        const text = formatBuildProgress(event);
        if (text) onProgress?.(text);
      });
    });
  } finally {
    session.close();
  }

  const image = docker.getImage(`${repository}:${tag}`);
  const { Id: imageId, Config: config } = await image.inspect();
  // Make sure that this is not an older image with the same tag
  const imageLabels = (config.Labels as Record<string, string> | null) ?? {};
  const isFresh = Object.entries(labels).every(([key, value]) => imageLabels[key] === value);
  if (!isFresh) {
    throw new Error(`Build of ${repository}:${tag} did not produce an image`);
  }
  await image.tag({ repo: repository, tag: "latest" });
  return imageId;
}

export function pullImage(imageName: string) {
  const fullImage = imageName.includes(":") ? imageName : `${imageName}:latest`;
  return new Promise<unknown>((resolve, reject) => {
    docker.pull(fullImage, (pullError: Error | null, stream: NodeJS.ReadableStream) => {
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

export type CreateContainerOptions = {
  readOnlyFiles?: Record<string, string>,
  labels?: Record<string, string>,
};

export async function createContainer(
  serviceName: string,
  imageId: string,
  env: Record<string, string>,
  ports: Record<string, string>,
  volumes: Record<string, string>,
  networkIds: string[],
  options: CreateContainerOptions = {},
) {
  const container = await docker.createContainer({
    name: serviceName,
    Image: imageId,
    Labels: {
      "com.docker.compose.project": "buttler",
      ...options.labels,
    },
    Env: Object.entries(env).map(([key, value]) => `${key}=${value}`),
    HostConfig: {
      Binds: [
        ...Object.entries(volumes).map(([key, value]) => `${key}:${value}`),
        ...Object.entries(options.readOnlyFiles ?? {}).map(([source, destination]) => {
          return `${source}:${destination}:ro`;
        }),
      ],
      PortBindings: Object.fromEntries(Object.entries(ports).map(([external, internal]) => {
        return [`${internal}/tcp`, [{ HostPort: external }]];
      })),
      RestartPolicy: {
        Name: "always",
      },
    },
    ExposedPorts: Object.fromEntries(Object.values(ports).map(port => [`${port}/tcp`, {}] as const)),
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
      // Containers have a TTY, so their output may include colors and other terminal sequences
      resolve(stripVTControlCharacters(buffer.toString()));
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

export async function createNetwork(networkId: string, containerIds: string[] = []) {
  const network = await docker.createNetwork({
    Name: networkId,
    Driver: "bridge",
    CheckDuplicate: true,
    Internal: false,
    Attachable: true,
  });
  await Promise.all(containerIds.map(containerId => connectContainerToNetwork(containerId, network.id)));
  return network;
}

export async function destroyNetwork(networkId: string, containerIds: string[] = []) {
  const network = docker.getNetwork(networkId);
  await Promise.all(containerIds.map(containerId => disconnectContainerFromNetwork(containerId, network.id)));
  await network.remove();
}

async function connectContainerToNetwork(containerId: string, networkId: string) {
  const network = docker.getNetwork(networkId);
  await network.connect({
    Container: containerId,
  });
}

async function disconnectContainerFromNetwork(containerId: string, networkId: string) {
  const network = docker.getNetwork(networkId);
  await network.disconnect({
    Container: containerId,
    // Force: true, // is this necessary?
  });
}

export async function getHostIp() {
  const network = docker.getNetwork("bridge");
  const inspection = await network.inspect();
  const gateway = inspection.IPAM?.Config?.[0]?.Gateway;
  return gateway as string;
}
