import "server-only";
import fs from "node:fs";
import path from "node:path";
import { after } from "next/server";
import { buildImage } from "~/core/docker";
import { listServiceImages, pruneServiceImages } from "~/core/docker/builds";
import {
  BUTTLER_BRANCH_LABEL,
  BUTTLER_BUILT_AT_LABEL,
  BUTTLER_COMMIT_LABEL,
  BUTTLER_SERVICE_LABEL,
} from "~/core/docker/labels";
import {
  type ServiceRef,
  assertServiceNotDeleting,
  deployServiceContainer,
  findServiceContainer,
  markServiceBuilding,
} from "~/core/docker/status";
import { getBuildArgs, getBuildSecrets } from "~/core/environment-variables";
import { cloneRepo, deleteRepo, parseRepository } from "~/core/git";
import { getInstallationTokenForOwner } from "~/core/github/app";
import { createRedactor } from "~/core/redact";
import { getSharedState } from "~/core/shared-state";
import { getFilePath } from "~/core/storage";

const runningBuilds = getSharedState("running-builds", () => new Map<string, Promise<void>>());
const queuedBuilds = getSharedState("queued-builds", () => new Map<string, Promise<void>>());

export function getBuildLogPath(serviceId: string) {
  return getFilePath("logs/builds", `${serviceId}.log`);
}

export async function deleteBuildLog(serviceId: string) {
  await fs.promises.rm(getBuildLogPath(serviceId), { force: true });
}

export function getImageRepository(service: ServiceRef) {
  const slug = (service.name ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `buttler/${slug || service.id}`;
}

/** Returns the ID of the most recently built image of a service */
export async function findLatestImage(serviceId: string): Promise<string | null> {
  const images = await listServiceImages(serviceId);
  return images.at(0)?.id ?? null;
}

/** Returns the ID of the image that the container of a service runs, if it's one of its builds */
async function findDeployedImage(serviceId: string): Promise<string | null> {
  const container = await findServiceContainer({ id: serviceId });
  if (!container) return null;
  const [
    { Image: imageId },
    images,
  ] = await Promise.all([
    container.inspect(),
    listServiceImages(serviceId),
  ]);
  return images.some(image => image.id === imageId) ? imageId : null;
}

/** A failed cleanup is done by the next build */
async function cleanUpImages(serviceId: string) {
  try {
    await pruneServiceImages(serviceId);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Failed to remove the old images of service ${serviceId}:`, error);
  }
}

function openBuildLog(serviceId: string) {
  const logPath = getBuildLogPath(serviceId);
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  const stream = fs.createWriteStream(logPath, { flags: "a", mode: 0o600 });
  stream.on("error", error => {
    // eslint-disable-next-line no-console
    console.error(`Failed to write the build log of service ${serviceId}:`, error);
  });
  return {
    write: (text: string) => void stream.write(text),
    line: (text: string) => void stream.write(`[${new Date().toISOString()}] ${text}\n`),
    close: () => void stream.end(),
  };
}

async function runPipeline(service: ServiceRef) {
  markServiceBuilding(service.id, true);
  try {
    // A queued build may start after a deletion has begun
    assertServiceNotDeleting(service.id);
    const { repository, branch } = service;
    if (!repository || !branch) {
      throw new Error(`No repository or branch specified for service ${service.id}`);
    }
    const log = openBuildLog(service.id);
    const secrets = getBuildSecrets(service.environmentVariables);
    const output = createRedactor(Object.values(secrets), log.write);
    try {
      log.line(`Cloning ${repository} (${branch})`);
      const { owner } = parseRepository(repository);
      const token = await getInstallationTokenForOwner(owner);
      const { repoPath, files, commit } = await cloneRepo({
        serviceId: service.id,
        repository,
        branch,
        token,
      });

      log.line(`Building ${commit.hash} by ${commit.author} at ${commit.timestamp}`);
      log.write(`${commit.message}\n`);
      const imageId = await buildImage({
        contextPath: repoPath,
        files,
        repository: getImageRepository(service),
        tag: commit.shortHash,
        labels: {
          [BUTTLER_SERVICE_LABEL]: service.id,
          [BUTTLER_BRANCH_LABEL]: branch,
          [BUTTLER_COMMIT_LABEL]: commit.hash,
          [BUTTLER_BUILT_AT_LABEL]: new Date().toISOString(),
        },
        buildArgs: getBuildArgs(service.environmentVariables),
        secrets,
        onProgress: output.write,
      });
      output.flush();

      // The previous container keeps running until the new image is ready
      log.line(`Deploying ${imageId}`);
      await deployServiceContainer(service, imageId);
      log.line("Deployed");
      await cleanUpImages(service.id);
    } catch (error) {
      output.flush();
      log.line(`Failed: ${output.redact(error instanceof Error ? error.message : String(error))}`);
      throw error;
    } finally {
      log.close();
      await deleteRepo(service.id);
    }
  } finally {
    markServiceBuilding(service.id, false);
  }
}

function runBuild(service: ServiceRef) {
  const build = runPipeline(service).finally(() => {
    runningBuilds.delete(service.id);
  });
  runningBuilds.set(service.id, build);
  return build;
}

/**
 * Builds and deploys a service. Builds of the same service never overlap:
 * a request made during a build runs after it, and further ones share that run.
 */
export function buildAndDeploy(service: ServiceRef): Promise<void> {
  const running = runningBuilds.get(service.id);
  if (!running) return runBuild(service);

  const queued = queuedBuilds.get(service.id);
  if (queued) return queued;

  const next = running.catch(() => undefined).then(() => {
    queuedBuilds.delete(service.id);
    return runBuild(service);
  });
  queuedBuilds.set(service.id, next);
  return next;
}

/** Builds and deploys a service after the response is sent */
export function startBuilding(service: ServiceRef) {
  assertServiceNotDeleting(service.id);
  markServiceBuilding(service.id, true);
  after(async () => {
    try {
      await buildAndDeploy(service);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`Failed to build service ${service.id}:`, error);
    }
  });
}

/**
 * Starts a service from the build that it's on, so a restart keeps a rollback, otherwise from its latest image.
 * It's built only if there is no image.
 */
export async function startGitHubService(service: ServiceRef): Promise<void> {
  assertServiceNotDeleting(service.id);
  const running = runningBuilds.get(service.id);
  if (running) return running;

  const image = await findDeployedImage(service.id) ?? await findLatestImage(service.id);
  if (image) {
    await deployServiceContainer(service, image);
  } else {
    await buildAndDeploy(service);
  }
}

/** Deploys an earlier build of a service without building it again */
export async function deployBuild(service: ServiceRef, imageId: string): Promise<void> {
  const images = await listServiceImages(service.id);
  if (!images.some(image => image.id === imageId)) {
    throw new Error(`The image ${imageId} is not a build of service ${service.id}`);
  }
  await deployServiceContainer(service, imageId);
}
