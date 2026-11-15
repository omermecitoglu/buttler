const DOCKER_HUB_API_BASE_URL = "https://hub.docker.com/v2";

export type ParsedDockerImage = {
  namespace: string,
  repository: string,
  tag?: string,
};

export function parseDockerImageName(input: string): ParsedDockerImage {
  const trimmed = input.trim();
  if (!trimmed) {
    return { namespace: "library", repository: "" };
  }

  // Check for tag (separated by colon, but not part of a port/protocol)
  let imagePart = trimmed;
  let tag: string | undefined;

  const colonIndex = trimmed.lastIndexOf(":");
  if (colonIndex !== -1 && !trimmed.slice(colonIndex).includes("/")) {
    imagePart = trimmed.slice(0, colonIndex);
    tag = trimmed.slice(colonIndex + 1);
  }

  const slashIndex = imagePart.indexOf("/");
  if (slashIndex === -1) {
    return {
      namespace: "library",
      repository: imagePart,
      tag,
    };
  }

  const namespace = imagePart.slice(0, slashIndex);
  const repository = imagePart.slice(slashIndex + 1);

  return {
    namespace: namespace || "library",
    repository,
    tag,
  };
}

export type GetDockerHubTagsOptions = {
  page?: number,
  pageSize?: number,
  name?: string,
};

export type DockerHubTagItem = {
  name: string,
  tagStatus?: string,
  lastUpdated?: string,
};

type DockerHubTagsApiResponse = {
  count: number,
  next: string | null,
  previous: string | null,
  results: {
    name: string,
    tag_status?: string,
    last_updated?: string,
  }[],
};

export async function getDockerHubTags(
  imageInput: string,
  options: GetDockerHubTagsOptions = {},
): Promise<string[]> {
  const { namespace, repository } = parseDockerImageName(imageInput);
  if (!repository) {
    return [];
  }

  const pageSize = options.pageSize ?? 25;
  const page = options.page ?? 1;

  const searchParams = new URLSearchParams();
  searchParams.set("page_size", String(pageSize));
  searchParams.set("page", String(page));
  if (options.name?.trim()) {
    searchParams.set("name", options.name.trim());
  }

  const encodedNamespace = encodeURIComponent(namespace);
  const encodedRepo = encodeURIComponent(repository);
  const url = `${DOCKER_HUB_API_BASE_URL}/repositories/${encodedNamespace}/${encodedRepo}/tags/?${searchParams.toString()}`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });

    if (response.status === 404) {
      return [];
    }

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as DockerHubTagsApiResponse;
    return data.results.map(r => r.name);
  } catch {
    return [];
  }
}
