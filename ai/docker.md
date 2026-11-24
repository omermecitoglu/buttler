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

## Build Triggers

- GitHub App webhooks are received at `/webhooks/github` (`src/app/webhooks/github/route.ts`). A push builds every service with the same repository and branch, after the response is sent.
- The "Rebuild" button of a GitHub service builds the latest commit of its branch (`triggerBuild`). It's ignored while the service is already being built.
- Builds of a service never overlap: pushes during a build share a single queued build, which clones the latest commit.

## Redeploys

- The "Redeploy" button of a Docker Hub service pulls its image and replaces the container (`redeployService`). The old container keeps running until the image is ready, and the service is marked as pulling until it's replaced.
- Builds and pulls go on after the response is sent, so the actions return what they led to (`ServiceActionOutcome`) instead of waiting. A failed pull is only written to the server log.

## Container Logs

Logs are read live from Docker and never stored.

- `readContainerLogs` (`src/core/docker/logs.ts`) follows the logs of a container until it stops or the signal is aborted.
- `/api/services/[id]/logs/stream` sends them as server-sent events. A message is a batch of lines, and its ID is the timestamp of the last line, so a reconnecting browser only receives the newer lines.
- The stream ends with an `end` event when the container stops, or a `failure` event when the logs can't be read.
- Docker only separates stdout and stderr for the containers without a TTY. The output of a container with a TTY is treated as stdout.
