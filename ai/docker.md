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
- A deploy always starts the new container, so "Rebuild" and "Redeploy" also start a stopped service.

## Deletion

- Only the admin can delete a service (`deleteServiceAction`), from the "Settings" tab of its page. System services can't be deleted, and neither can services that are being built or pulled, because they would be deployed again.
- The container, its ingress network, the built images, the chosen volumes and the domains in the Nginx config are removed before the database row, so a deletion that fails can be tried again (`src/core/docker/removal.ts`).
- Containers are matched by the label or the `buttler-service-<id>` name only. `matchContainerForService` also matches by the service name, which may find an unrelated container.
- Volumes are kept, except the ones that are chosen in the dialog. The ones that other services or containers use are always kept. Stopped services have no container, so the `volumes` table is checked too (`getSharedVolumes`).
- Docker Hub images are never removed, other containers may use them.

## Ingress Networks

- A service with at least one domain shares a network with Nginx (`src/core/docker/ingress.ts`). Every service has its own, so the services can't reach each other through them.
- The networks are named `buttler-ingress-<service id>`, and the service has the alias `service-<service id>` in it. Nginx must use the alias, which stays the same when the container is replaced.
- `syncIngressNetwork` makes the network of a service match its domains in SQLite. It runs after a domain is added or removed, and on every deploy: before the old container is replaced, and again before the new one is started.
- `provisionReverseProxy` syncs all of them, at startup too. This connects a new Nginx container and removes leftovers.
- Changes run one after another, and read the domains when it's their turn.
- A domain isn't added if its service can't be connected. A failed cleanup of a removed domain is only logged, and done by the next sync.
- The networks are internal, so the default network stays the gateway of the containers. Their subnets are `/28` blocks of `172.30.0.0/16` that no other network of Docker or the host overlaps.
- Networks are only found by their labels (`buttler.network=ingress` and `buttler.service-id`). Others are never used, changed or removed, and a network that is used by an unrelated container is kept.
- The container is connected after it's created, because networks that are given at creation would replace the default one.

## Nginx Config

- `generateProxyConfig` (`src/core/nginx-conf.ts`) generates `default.conf` from the domains in SQLite, with one server per hostname. The default server has the health check (`/healthz`), and answers unknown hostnames with a 404.
- `syncReverseProxyConfig` (`src/core/nginx.ts`) writes it, tests it with `nginx -t` and reloads Nginx. If that fails, the previous config is restored and the error is thrown. It runs after a domain is added or removed, and in `provisionReverseProxy`, at startup too.
- Nginx reads the config when it starts, so while it isn't running the config is only written, without a test or a reload. A domain change never starts Nginx.
- A domain change is undone if Nginx can't be reloaded. A domain that can't be removed is still served, so it stays in SQLite.
- `deleteFromReverseProxy` removes the domains of a service from the config right before its row is deleted. They are served again if the service is kept.
- Changes run one after another, and read the domains when it's their turn.
- The upstream is in a variable and resolved by Docker (`127.0.0.11`), so a service that isn't running leads to a 502 instead of a config that can't be loaded. The answers are only cached for 5 seconds, because a new container can have a new IP.
- HTTPS ends at Cloudflare, so `X-Forwarded-Proto` is always `https`.

## Container Logs

Logs are read live from Docker and never stored.

- `readContainerLogs` (`src/core/docker/logs.ts`) follows the logs of a container until it stops or the signal is aborted.
- `/api/services/[id]/logs/stream` sends them as server-sent events. A message is a batch of lines, and its ID is the timestamp of the last line, so a reconnecting browser only receives the newer lines.
- The stream ends with an `end` event when the container stops, or a `failure` event when the logs can't be read.
- Docker only separates stdout and stderr for the containers without a TTY. The output of a container with a TTY is treated as stdout.
- Buttler creates its containers without a TTY. The ones that were created with a TTY keep it until they are recreated.
