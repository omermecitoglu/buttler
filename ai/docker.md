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
- The progress of a pull is kept in memory (`getServicePullProgress`) and streamed by `/api/services/[id]/pull/stream`. It's shown as two bars, the download and the extraction, on the service page and in the service list. Docker only knows the size of a layer once its download starts, so the totals grow and the bars can move back early on.
- A deploy always starts the new container, so "Rebuild" and "Redeploy" also start a stopped service.

## Replacing Containers

- A deploy never removes the old container before the new one has started (`replaceServiceContainer` in `src/core/docker/status.ts`). Deploys, redeploys, starts, restarts and recreations all go through it.
- Container names are unique, so the new container is created as `buttler-service-<id>-next` and renamed when the old one is removed. While both exist, `matchContainerForService` prefers the one with the name of the service.
- A service without published ports or volumes switches without downtime: the new container starts while the old one runs, then the old one is stopped and removed.
- Two containers can't publish the same host port and shouldn't write to the same volume, so a service with either stops the old container right before the new one starts.
- If the new container can't be created, connected or started, it's removed and the service stays on the old container, which is started again if it was running.
- "Started" means Docker started it. A container that crashes afterwards is the fault of the app, Buttler doesn't roll it back.
- Once the new container runs, a failure to remove the old one or to rename the new one is only logged. The next deploy removes every other container of the service before it starts.
- A restart of a Docker Hub or GitHub service doesn't stop the container first, its start replaces it anyway.

## Exposed Ports

- The ports a service's image exposes (`EXPOSE`, including those of a base image) are read from Docker when a page renders, never stored (`getExposedPortsOfService` in `src/data/services.ts`). Only TCP ports are kept.
- The image is the latest build of a GitHub service, or the pulled image of a Docker Hub service. A missing image exposes nothing.
- The first exposed port is the default container port of a new domain, before the first port mapping. The port mappings editor offers the exposed ports that are not mapped yet.
- Port mappings are only applied when the container is created again. The port mappings editor offers to recreate it right away (`updateServiceAction` with `recreate`), otherwise they are applied by the next restart, start or deploy.

## Deletion

- Only the admin can delete a service (`deleteServiceAction`), from the "Settings" tab of its page. System services can't be deleted, and neither can services that are being built or pulled, because they would be deployed again.
- The container, its internet and link networks, the built images, the chosen volumes and the domains in the Nginx config are removed before the database row, so a deletion that fails can be tried again (`src/core/docker/removal.ts`).
- Containers are matched by the label or the `buttler-service-<id>` name only. `matchContainerForService` also matches by the service name, which may find an unrelated container.
- Volumes are kept, except the ones that are chosen in the dialog. The ones that other services or containers use are always kept. Stopped services have no container, so the `volumes` table is checked too (`getSharedVolumes`).
- Only the volumes that Buttler created can be chosen, and `removeVolumes` checks the label too.
- Docker Hub images are never removed, other containers may use them.

## Service Networks

- Services are isolated: a service container is never on the default `bridge` network, and never on a network with another service.
- Whether a service has internet access is the `internet_access` column of `services`. The create form requires a choice, existing services got internet access with the migration.
- Every service has its own internet network (`src/core/docker/internet.ts`), a non-internal bridge network named `buttler-internet-<service id>` and labelled `buttler.network=internet`.
- A deploy creates the container on its internet network (`NetworkMode`), because a container that is created without a network joins the default `bridge` network. A service without internet access leaves it before the container is started, and the network is removed.
- `NetworkMode: "none"` is not used, a container with it can never join a network later (links).
- A change of internet access is only applied when the container is created again. The settings form offers to recreate it right away (`updateInternetAccessAction`), otherwise it's applied by the next restart, start or deploy.
- Containers that were created before keep the default `bridge` network until they are recreated.
- Host ports that a service publishes are not affected.

## Service Links

- A link is the only way two services can reach each other. It's two-sided, Docker can't enforce a direction, and there is at most one link per pair (`service_links`, see `ai/database.md`).
- Every link has its own internal network (`src/core/docker/links.ts`), named `buttler-link-<link id>` and labelled `buttler.network=link` and `buttler.link-id`. Only the two containers are on it (and a replacement while one is deployed), and they reach each other by `buttler-service-<service id>`. It's the container name and also an alias on every link network, so the replacement is reached by it before it's renamed.
- Adding or removing a link connects or disconnects the containers right away (`syncLinkNetwork`). A link whose network can't be set up isn't kept, and a link whose network can't be removed is restored, because the services could still reach each other.
- A deploy connects the container to the networks of all its links (`connectLinkNetworks`), before the new container is created and again before it's started. While both are on the network, the alias resolves to both of them. A stopped service has no container, it's connected when it's started.
- A deletion removes the link networks before the database row, the links are deleted with it.
- `syncLinkNetworks` runs at startup, it connects every link again and removes the networks of the links that are gone.
- Only the containers of services are disconnected, a network that is used by an unrelated container is kept.
- Every user can add and remove links, on the "Links" tab of a service. System services can't be linked there, Nginx is linked by Buttler.
- Inherited variables (`ai/database.md`) are runtime-only. They are resolved when the service is loaded for a deploy (`getDeployableService`), and the container gets them before its own variables, which win.
- A change of shared variables, of inheritance or of a rename is only applied when the container is created again. The forms offer to recreate the affected running containers (`recreateRunningServices`), stopped services get it when they are started.

## Nginx Links

- Nginx reaches a service over a link, which it has while the service has at least one domain. The link is created with the first domain and removed with the last one.
- `syncReverseProxyLinks` (`src/core/docker/links.ts`) makes the links of Nginx match the domains in SQLite (`syncReverseProxyLinks` in `src/operations`), and syncs their networks. It runs after a domain is added or removed, for that service, and in `provisionReverseProxy` for all of them, at startup too. This connects a new Nginx container and removes leftovers.
- The links of Nginx are shown on the "Links" tab of a service, but they can't be removed there and the variables of Nginx can't be inherited (`removeLinkAction` and `updateLinkInheritanceAction` refuse links with a system service).
- A domain isn't added if its link can't be set up. A failed cleanup of a removed domain is only logged, and done by the next sync.
- A deploy needs nothing else, the container is connected to all of its links anyway.
- Older versions connected Nginx through ingress networks (`buttler-ingress-<service id>`, labelled `buttler.network=ingress`). `provisionReverseProxy` removes them after the config uses the links (`src/core/docker/ingress.ts`), a network that is used by an unrelated container is kept.

## Network Subnets

- Docker's default pools run out at about 30 networks, so every network that Buttler creates gets an explicit `/29` subnet (2 containers, their replacements and the gateway) from `10.213.0.0/16`, which is outside of Docker's default pools and of common LANs (`src/core/docker/networks.ts`).
- Always create networks with `createButtlerNetwork`. It picks the first subnet that no network of Docker or interface of the host overlaps, so the subnets of removed networks are reused. Nothing is stored in SQLite.
- Networks are created one after another, otherwise two of them could pick the same subnet.
- Networks that were created before (the tunnel network without a subnet) keep working until they are replaced.

## Nginx Config

- `generateProxyConfig` (`src/core/nginx-conf.ts`) generates `default.conf` from the domains in SQLite, with one server per hostname. The default server has the health check (`/healthz`), and answers unknown hostnames with a 404.
- `syncReverseProxyConfig` (`src/core/nginx.ts`) writes it, tests it with `nginx -t` and reloads Nginx. If that fails, the previous config is restored and the error is thrown. It runs after a domain is added or removed, and in `provisionReverseProxy`, at startup too.
- Nginx reads the config when it starts, so while it isn't running the config is only written, without a test or a reload. A domain change never starts Nginx.
- A domain change is undone if Nginx can't be reloaded. A domain that can't be removed is still served, so it stays in SQLite.
- `deleteFromReverseProxy` removes the domains of a service from the config right before its row is deleted. They are served again if the service is kept. The tunnel and the DNS records are cleaned up before, see `ai/cloudflare.md`.
- Changes run one after another, and read the domains when it's their turn.
- The upstream is the name of the service container (`buttler-service-<service id>`), which stays the same when the container is replaced, because the replacement has it as an alias on the link. It's in a variable and resolved by Docker (`127.0.0.11`), so a service that isn't running leads to a 502 instead of a config that can't be loaded. The answers are only cached for 5 seconds, because a new container can have a new IP.
- The dashboard is served at the domain that the admin sets on the settings page. Buttler runs on the host, so Nginx reaches it at `host.docker.internal`, on the port in `PORT`. The firewall of the host must let the Docker network reach that port, and Buttler must not only listen on the loopback interface.
- `host.docker.internal` is in the hosts file of the container (`ExtraHosts`). The embedded DNS of Docker isn't expected to know it, so it's not in a variable. `provisionReverseProxy` replaces the containers of older versions, which don't have it.
- Nginx publishes no ports, the Cloudflare tunnel is the only way to reach the domains from outside. The containers of older versions, which publish them, are replaced.
- The port of Buttler stays open on the host, for the installation and for the instances without a domain.
- GitHub only knows the address that was used for the installation. The settings page shows the URLs that have to be changed in the GitHub App.
- HTTPS ends at Cloudflare, so `X-Forwarded-Proto` is always `https`.

## Volumes

- Buttler labels the volumes it creates with `buttler.volume`, when a deploy creates them. Creating a volume that already exists doesn't change it, so volumes from outside never get the label.
- Volumes that Buttler created before the label look like they are from outside: they keep working and can still be attached by typing their name, but they are not listed and are never deleted with their service.
- A storage mount either types the name of a new volume, or picks one of the labelled volumes (`getVolumeOptions` in `src/data/services.ts`, read live from Docker).
- Volume names are passed to Docker as they are, so two services with the same name share one volume. The form warns with the names of the other services that mount it (`getVolumeUsers`), sharing is still allowed. Stopped services have no container, so this comes from the `volumes` table.
- Volumes that nothing uses are not listed or removed anywhere else.

## Container Logs

Logs are read live from Docker and never stored.

- `readContainerLogs` (`src/core/docker/logs.ts`) follows the logs of a container until it stops or the signal is aborted.
- `/api/services/[id]/logs/stream` sends them as server-sent events. A message is a batch of lines, and its ID is the timestamp of the last line, so a reconnecting browser only receives the newer lines.
- The stream ends with an `end` event when the container stops, or a `failure` event when the logs can't be read.
- Docker only separates stdout and stderr for the containers without a TTY. The output of a container with a TTY is treated as stdout.
- Buttler creates its containers without a TTY. The ones that were created with a TTY keep it until they are recreated.
