# Docker Builds

Docker is the single source of truth for builds, nothing about them is stored in SQLite.

- Buttler labels the images it builds with `buttler.service-id`, `buttler.branch`, `buttler.commit` and `buttler.built-at` (`src/core/docker/labels.ts`).
- `getServiceBuilds(serviceId)` (`src/core/docker/builds.ts`) returns the builds of a service, the newest first:
  - `ready` builds are the labelled images.
  - `building` and `failed` builds come from the build history of BuildKit (`src/core/docker/build-history.ts`), which records the requested labels as `label:*` frontend attributes.
- BuildKit removes old records on its own, so failed builds are only listed for a limited time.
- Steps outside of the image build (cloning, deploying) are unknown to BuildKit. While they run, the service is marked as building in memory (`markServiceBuilding`), and their errors are only in the build log.
- The history is read through the `/grpc` endpoint of Docker. The endpoint is deprecated in favour of native gRPC over the Docker socket, which older Docker versions don't support.
- When the history is not available, only the `ready` builds are listed.
