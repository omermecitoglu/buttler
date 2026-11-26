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
- The container, its ingress and internet networks, the built images, the chosen volumes and the domains in the Nginx config are removed before the database row, so a deletion that fails can be tried again (`src/core/docker/removal.ts`).
- Containers are matched by the label or the `buttler-service-<id>` name only. `matchContainerForService` also matches by the service name, which may find an unrelated container.
- Volumes are kept, except the ones that are chosen in the dialog. The ones that other services or containers use are always kept. Stopped services have no container, so the `volumes` table is checked too (`getSharedVolumes`).
- Docker Hub images are never removed, other containers may use them.

## Service Networks

- Services are isolated: a service container is never on the default `bridge` network, and never on a network with another service.
- Whether a service has internet access is the `internet_access` column of `services`. The create form requires a choice, existing services got internet access with the migration.
- Every service has its own internet network (`src/core/docker/internet.ts`), a non-internal bridge network named `buttler-internet-<service id>` and labelled `buttler.network=internet`.
- A deploy creates the container on its internet network (`NetworkMode`), because a container that is created without a network joins the default `bridge` network. A service without internet access leaves it before the container is started, and the network is removed.
- `NetworkMode: "none"` is not used, a container with it can never join a network later (ingress networks, links).
- A change of internet access is only applied when the container is created again. The settings form offers to recreate it right away (`updateInternetAccessAction`), otherwise it's applied by the next restart, start or deploy.
- Containers that were created before keep the default `bridge` network until they are recreated.
- Host ports that a service publishes are not affected.

## Service Links

- A link is the only way two services can reach each other. It's two-sided, Docker can't enforce a direction, and there is at most one link per pair (`service_links`, see `ai/database.md`).
- Every link has its own internal network (`src/core/docker/links.ts`), named `buttler-link-<link id>` and labelled `buttler.network=link` and `buttler.link-id`. Only the two containers are on it, and they reach each other by the container name, `buttler-service-<service id>`.
- Adding or removing a link connects or disconnects the containers right away (`syncLinkNetwork`). A link whose network can't be set up isn't kept, and a link whose network can't be removed is restored, because the services could still reach each other.
- A deploy connects the container to the networks of all its links (`connectLinkNetworks`), before the old container is replaced and again before the new one is started. A stopped service has no container, it's connected when it's started.
- A deletion removes the link networks before the database row, the links are deleted with it.
- `syncLinkNetworks` runs at startup, it connects every link again and removes the networks of the links that are gone.
- Only the containers of services are disconnected, a network that is used by an unrelated container is kept.
- Every user can add and remove links, on the "Links" tab of a service. System services can't be linked there, Nginx is linked by Buttler.

## Ingress Networks

- A service with at least one domain shares a network with Nginx (`src/core/docker/ingress.ts`). Every service has its own, so the services can't reach each other through them.
- The networks are named `buttler-ingress-<service id>`, and the service has the alias `service-<service id>` in it. Nginx must use the alias, which stays the same when the container is replaced.
- `syncIngressNetwork` makes the network of a service match its domains in SQLite. It runs after a domain is added or removed, and on every deploy: before the old container is replaced, and again before the new one is started.
- `provisionReverseProxy` syncs all of them, at startup too. This connects a new Nginx container and removes leftovers.
- Changes run one after another, and read the domains when it's their turn.
- A domain isn't added if its service can't be connected. A failed cleanup of a removed domain is only logged, and done by the next sync.
- The networks are internal, only the internet network of a service reaches the outside.
- Networks are only found by their labels (`buttler.network=ingress` and `buttler.service-id`). Others are never used, changed or removed, and a network that is used by an unrelated container is kept.
- The container is connected after it's created, its internet network is the one that is given at creation.

## Network Subnets

- Docker's default pools run out at about 30 networks, so every network that Buttler creates gets an explicit `/29` subnet (2 containers and the gateway) from `10.213.0.0/16`, which is outside of Docker's default pools and of common LANs (`src/core/docker/networks.ts`).
- Always create networks with `createButtlerNetwork`. It picks the first subnet that no network of Docker or interface of the host overlaps, so the subnets of removed networks are reused. Nothing is stored in SQLite.
- Networks are created one after another, otherwise two of them could pick the same subnet.
- Networks that were created before (ingress networks in `172.30.0.0/16`, the tunnel network without a subnet) keep working until they are replaced.

## Nginx Config

- `generateProxyConfig` (`src/core/nginx-conf.ts`) generates `default.conf` from the domains in SQLite, with one server per hostname. The default server has the health check (`/healthz`), and answers unknown hostnames with a 404.
- `syncReverseProxyConfig` (`src/core/nginx.ts`) writes it, tests it with `nginx -t` and reloads Nginx. If that fails, the previous config is restored and the error is thrown. It runs after a domain is added or removed, and in `provisionReverseProxy`, at startup too.
- Nginx reads the config when it starts, so while it isn't running the config is only written, without a test or a reload. A domain change never starts Nginx.
- A domain change is undone if Nginx can't be reloaded. A domain that can't be removed is still served, so it stays in SQLite.
- `deleteFromReverseProxy` removes the domains of a service from the config right before its row is deleted. They are served again if the service is kept. The tunnel and the DNS records are cleaned up before, see `ai/cloudflare.md`.
- Changes run one after another, and read the domains when it's their turn.
- The upstream is in a variable and resolved by Docker (`127.0.0.11`), so a service that isn't running leads to a 502 instead of a config that can't be loaded. The answers are only cached for 5 seconds, because a new container can have a new IP.
- The dashboard is served at the domain that the admin sets on the settings page. Buttler runs on the host, so Nginx reaches it at `host.docker.internal`, on the port in `PORT`. The firewall of the host must let the Docker network reach that port, and Buttler must not only listen on the loopback interface.
- `host.docker.internal` is in the hosts file of the container (`ExtraHosts`). The embedded DNS of Docker isn't expected to know it, so it's not in a variable. `provisionReverseProxy` replaces the containers of older versions, which don't have it.
- Nginx publishes no ports, the Cloudflare tunnel is the only way to reach the domains from outside. The containers of older versions, which publish them, are replaced.
- The port of Buttler stays open on the host, for the installation and for the instances without a domain.
- GitHub only knows the address that was used for the installation. The settings page shows the URLs that have to be changed in the GitHub App.
- HTTPS ends at Cloudflare, so `X-Forwarded-Proto` is always `https`.

## Container Logs

Logs are read live from Docker and never stored.

- `readContainerLogs` (`src/core/docker/logs.ts`) follows the logs of a container until it stops or the signal is aborted.
- `/api/services/[id]/logs/stream` sends them as server-sent events. A message is a batch of lines, and its ID is the timestamp of the last line, so a reconnecting browser only receives the newer lines.
- The stream ends with an `end` event when the container stops, or a `failure` event when the logs can't be read.
- Docker only separates stdout and stderr for the containers without a TTY. The output of a container with a TTY is treated as stdout.
- Buttler creates its containers without a TTY. The ones that were created with a TTY keep it until they are recreated.
