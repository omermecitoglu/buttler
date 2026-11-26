# Database & ORM Guide (v2)

## Stack & Drivers

- **ORM**: Drizzle ORM `v1.0.0-rc.5` with Relational Queries v2 (`defineRelations`).
- **Driver**: Node.js built-in `node:sqlite` (`DatabaseSync`) via `drizzle-orm/node-sqlite`. No external SQLite bindings (like `better-sqlite3`) are needed.
- **Migration Engine**: `drizzle-kit` using the v3 migration folder structure (DDL snapshots, individual migration folders).

## Database Location

- **Default Path**: `$HOME/.buttler/database.sqlite`
- The directory `$HOME/.buttler` is created automatically if it does not exist.
- **Override**: Set `process.env.BUTTLER_DB_PATH` (e.g. `:memory:` for isolated tests or custom path).
- **CLI / Drizzle Config**: `drizzle.config.ts` reads `process.env.BUTTLER_DB_PATH` or resolves to `$HOME/.buttler/database.sqlite`.

## Schema Principles

- **Minimal Metadata**: SQLite stores only configuration and metadata that Docker cannot know (e.g., service definitions, names, user accounts, service links).
- **Docker as Source of Truth**: Never duplicate runtime state (container status, ports, networks, volumes, image lists) in SQLite.
- **Casing**: Tables use snake_case via `snakeCase.table` from `drizzle-orm/sqlite-core`.
- **Validation**: Models use `drizzle-orm/zod` along with `drizzle-zod-shared-refinements` (targeting Zod 4).

## Migrations

- Generate migration: `npm run migrate` (`drizzle-kit generate`)
- Run migrations programmatically: `npm run build:migration` (`scripts/migrate.ts` calling `src/database/migrate.ts`)

## Operations Layer (`src/operations`)

- The purpose of the `src/operations/` directory is to keep database operation functions isolated and abstract from the rest of the application.
- If Drizzle is ever replaced with another ORM or database layer in the future, only `src/database/schema` and `src/operations/` need to be refactored.
- Server actions, API routes, and background tasks should invoke these operations rather than performing direct ad-hoc database queries.
- **Transactions are synchronous**: `node:sqlite` (`DatabaseSync`) is a synchronous driver, so a `db.transaction` callback must not be `async` or `await` anything; an async callback commits before its awaited queries run (see #40). Inside it, end each query with `.run()`, `.get()` or `.all()`, and do any async work (Docker, network, encryption that awaits) before or after the transaction.

## Environment Variables & Secrets

- Each variable has a `scope` (`build`, `runtime` or `both`, default `runtime`) and an `is_secret` flag. Use the helpers in `src/core/environment-variables.ts` to pick the variables for a build or a container.
- Secret values are encrypted in the operations layer (AES-256-GCM, `src/core/secrets.ts`). The key is generated at `$HOME/.buttler/secret.key` (`BUTTLER_HOME` overrides the directory). It must never be stored in the database or backed up together with it.
- Secrets are write-only: `getService` returns `null` for their values. Only `getDeployableService` decrypts them, and its result must never be cached or sent to the browser.
- Secrets never become Docker build args. They are served to BuildKit by the build session (`src/core/docker/build-session.ts`).

## Domains

- The `domains` table holds the desired public hostnames. The hostname is the primary key, so it can only belong to one service.
- Only exact hostnames are stored, in lowercase (`src/core/domains.ts`). The port is the one inside the container, it doesn't need to be published.
- System services can't have domains.
- The domain of the dashboard is the `dashboard_domain` setting. `createDomain` and `setDashboardDomain` check both places in a transaction, so a service and the dashboard can't have the same hostname.
- The `dns_records` table is what is known about the hostnames in Cloudflare: the record that Buttler has created, and why a hostname isn't in sync. It has no relation to the domains, because a record outlives its domain until it's deleted in Cloudflare.

## Service Links

- The `service_links` table holds the links between services. The pair is stored in order (`service_a_id < service_b_id`, a check constraint) with a unique index, so there is at most one link per pair, whichever side adds it. `createServiceLink` sorts the IDs.
- Both foreign keys cascade, so the links of a service are deleted with it.
- The networks of the links are only in Docker, see `ai/docker.md`.

## Shared Variables

- A service offers variables to its linked services in the `shared_variables` table: a key and a template, which refers to the service itself (`{host}`, `{env.NAME}`, `{env.NAME:-fallback}`, see `src/core/shared-variables.ts`). Templates are stored as they are, never encrypted.
- `{env.NAME}` only uses the hand-written `runtime` and `both` variables of the sharing service, so shared variables can't refer to each other. An unset variable without a fallback resolves to an empty string.
- Each side of a link inherits the shared variables of the other side when its column is set (`service_a_inherits`, `service_b_inherits`, off by default).
- `shared_variable_names` only holds the renamed variables, by the ID of the shared variable, so a rename survives a new key. `saveSharedVariables` updates the variables with an ID in place, because replacing them would delete their names.
- `getInheritedVariables` resolves what a service inherits. When two inherited variables have the same name, the one of the older link is kept. A value built from a secret is a secret, and it's `null` unless it's decrypted for a deploy.
- The actions block two inherited variables with the same name, and new hand-written variables with an inherited name. If both exist anyway, the hand-written one wins.

## Users & Access

- The `users` table lists the people who have access, by their GitHub user ID. Everyone else is denied.
- The user who logs in with the setup link becomes the admin (`claimAdmin`), see `ai/setup.md`. A partial unique index allows only one admin.
- The other users are `member`s, whitelisted by the admin. Handles and avatars are only for display, they are updated on login (`updateUser`).
- `getAccess` (`src/core/access.ts`) is the only function that decides whether a user has access. A session is never enough on its own.
