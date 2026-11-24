import { docker } from "~/core/docker";
import { type BuildRecord, listBuildRecords } from "./build-history";
import {
  BUTTLER_BRANCH_LABEL,
  BUTTLER_BUILT_AT_LABEL,
  BUTTLER_COMMIT_LABEL,
  BUTTLER_SERVICE_LABEL,
} from "./labels";
import type Docker from "dockerode";

export type ServiceImage = {
  id: string,
  serviceId: string,
  branch: string | null,
  commit: string | null,
  tags: string[],
  /** Size in bytes */
  size: number,
  /** ISO 8601 date string */
  builtAt: string,
};

type BuildSource = {
  /** ID of the image if the build is ready, otherwise the BuildKit reference of it */
  id: string,
  branch: string | null,
  commit: string | null,
  /** ISO 8601 date string */
  builtAt: string,
};

export type ServiceBuild = BuildSource & (
  { status: "ready", tags: string[], size: number } |
  { status: "building" } |
  { status: "failed", error: string }
);

function parseImage(image: Docker.ImageInfo): ServiceImage {
  return {
    id: image.Id,
    serviceId: image.Labels[BUTTLER_SERVICE_LABEL],
    branch: image.Labels[BUTTLER_BRANCH_LABEL] || null,
    commit: image.Labels[BUTTLER_COMMIT_LABEL] || null,
    // Images that lost their tags to a newer build may be listed with a placeholder
    tags: (image.RepoTags ?? []).filter(tag => tag !== "<none>:<none>"),
    size: image.Size,
    builtAt: image.Labels[BUTTLER_BUILT_AT_LABEL] || new Date(image.Created * 1000).toISOString(),
  };
}

/** Returns the images that are built by Buttler, the newest first */
export async function listServiceImages(serviceId?: string): Promise<ServiceImage[]> {
  const images = await docker.listImages({
    filters: { label: [serviceId ? `${BUTTLER_SERVICE_LABEL}=${serviceId}` : BUTTLER_SERVICE_LABEL] },
  });
  return images.map(parseImage).toSorted((a, b) => b.builtAt.localeCompare(a.builtAt));
}

/** The images are still useful when the history is not available */
async function listRecords(): Promise<BuildRecord[]> {
  try {
    return await listBuildRecords(docker.modem);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to query the BuildKit history:", error);
    return [];
  }
}

/** Successful builds are ignored, they are represented by their images */
function parseRecord(record: BuildRecord): ServiceBuild | null {
  const source: BuildSource = {
    id: record.ref,
    branch: record.labels[BUTTLER_BRANCH_LABEL] || null,
    commit: record.labels[BUTTLER_COMMIT_LABEL] || null,
    builtAt: record.labels[BUTTLER_BUILT_AT_LABEL] || (record.createdAt?.toISOString() ?? ""),
  };
  if (record.error !== null) return { ...source, status: "failed", error: record.error };
  if (!record.completedAt) return { ...source, status: "building" };
  return null;
}

/** Returns the builds of a service that are known by Docker, the newest first */
export async function getServiceBuilds(serviceId: string): Promise<ServiceBuild[]> {
  const [
    images,
    records,
  ] = await Promise.all([
    listServiceImages(serviceId),
    listRecords(),
  ]);
  const readyBuilds = images.map(({ serviceId: _, ...image }): ServiceBuild => ({ ...image, status: "ready" }));
  const otherBuilds = records
    .filter(record => record.labels[BUTTLER_SERVICE_LABEL] === serviceId)
    .map(parseRecord)
    .filter(build => build !== null);
  return [...readyBuilds, ...otherBuilds].toSorted((a, b) => b.builtAt.localeCompare(a.builtAt));
}

/** Returns the IDs of the services that are being built right now */
export async function getBuildingServiceIds(): Promise<Set<string>> {
  const records = await listRecords();
  return new Set(records
    .filter(record => parseRecord(record)?.status === "building")
    .map(record => record.labels[BUTTLER_SERVICE_LABEL])
    .filter(Boolean));
}
