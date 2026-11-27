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
- The credentials of the GitHub App (`github_private_key`, `github_client_secret`, `github_webhook_secret`) and the `session_password` are encrypted by `setSetting` and decrypted by `getSetting` (`src/core/settings.ts`), with the key of the setting as the context. A value that can't be decrypted reads as `null`.
- `secureStoredSettings` runs at startup, before `prepareSetup`. It encrypts the plain values of older versions. If the credentials of the GitHub App can't be decrypted (the key file was lost), it removes them and sets `installed` to `false`: `prepareSetup` creates a setup link even though there is an admin, the setup goes back to the GitHub App, and the admin keeps the role. A lost session password is replaced on its first use, everyone logs in again.
- Secrets are write-only: `getService` returns `null` for their values. Only `getDeployableService` decrypts them, and its result must never be cached or sent to the browser.
- Secrets never become Docker build args. They are served to BuildKit by the build session (`src/core/docker/build-session.ts`).

## Domains

- The `domains` table holds the desired public hostnames. The hostname is the primary key, so it can only belong to one service.
- Only exact hostnames are stored, in lowercase (`src/core/domains.ts`). The port is the one inside the container, it doesn't need to be published.
- System services can't have domains.
- The services list hides the system services unless the `show_system_services` setting is `"true"` (off by default, changed on the Settings page by the admin). Only the list is filtered, their pages and links keep working.
- The domain of the dashboard is the `dashboard_domain` setting. `createDomain` and `setDashboardDomain` check both places in a transaction, so a service and the dashboard can't have the same hostname.
- The `dns_records` table is what is known about the hostnames in Cloudflare: the record that Buttler has created, and why a hostname isn't in sync. It has no relation to the domains, because a record outlives its domain until it's deleted in Cloudflare.

## Service Links

- The `service_links` table holds the links between services. The pair is stored in order (`service_a_id < service_b_id`, a check constraint) with a unique index, so there is at most one link per pair, whichever side adds it. `createServiceLink` sorts the IDs.
- Both foreign keys cascade, so the links of a service are deleted with it.
- The networks of the links are only in Docker, see `ai/docker.md`.
- Nginx has a link to every service with a domain. Its rows are kept in sync with the `domains` table by `syncReverseProxyLinks`, in a single transaction, see `ai/docker.md`.

## Shared Variables

- A service offers variables to its linked services in the `shared_variables` table: a key and a template, which refers to the service itself (`{host}`, `{env.NAME}`, `{env.NAME:-fallback}`, see `src/core/shared-variables.ts`). Templates are stored as they are, never encrypted.
- `{env.NAME}` only uses the hand-written `runtime` and `both` variables of the sharing service, so shared variables can't refer to each other. An unset variable without a fallback resolves to an empty string.
- Each side of a link inherits the shared variables of the other side when its column is set (`service_a_inherits`, `service_b_inherits`, off by default).
- `shared_variable_names` only holds the renamed variables, by the ID of the shared variable, so a rename survives a new key. `saveSharedVariables` updates the variables with an ID in place, because replacing them would delete their names.
- `getInheritedVariables` resolves what a service inherits. When two inherited variables have the same name, the one of the older link is kept. A value built from a secret is a secret, and it's `null` unless it's decrypted for a deploy.
- The actions block two inherited variables with the same name, and new hand-written variables with an inherited name. If both exist anyway, the hand-written one wins.
- The new service form prefills the shared variables of the official `postgres`, `mysql`, `mariadb`, `redis` and `mongo` images, and the variables of the image they refer to, with generated passwords (`src/core/database-presets.ts`). Only the repo name is matched, the tag is ignored.
- Presets only exist in the form, nothing marks the saved variables. Choosing another image replaces the prefilled ones, edited or not.

## Users & Access

- The `users` table lists the people who have access, by their GitHub user ID. Everyone else is denied.
- The user who logs in with the setup link becomes the admin (`claimAdmin`), see `ai/setup.md`. A partial unique index allows only one admin.
- The other users are `member`s, whitelisted by the admin. Handles and avatars are only for display, they are updated on login (`updateUser`).
- `getAccess` (`src/core/access.ts`) is the only function that decides whether a user has access. A session is never enough on its own.

## Service Recipes

- A recipe is a JSON file that describes services, so the same services can be created on another Buttler. Its format is `ServiceRecipeSchema` in `src/core/service-recipe.ts`, and it starts with `"version": 1` (`SERVICE_RECIPE_VERSION`). Change the version when the format changes.
- `getServiceRecipe` builds it from the chosen services, and `GET /api/services/export?id=…` downloads it. The Export button of the services list chooses the services, all of them by default.
- It holds the settings that the database keeps: source, internet access, ports, volumes (only the name and the path, never the data), environment variables, domains, shared variables, and the links with their inherit checkboxes and renamed variables.
- System services are left out, Buttler creates them itself. The values of secrets are always `null`. A link is only kept when both of its services are chosen.
- Service names aren't unique, so the links refer to the services by their ID in the file. Those IDs are only references, they aren't kept by an import.
- `importServices` (`src/actions/service.ts`) imports a recipe, only the admin can do it because it adds domains. `ServiceRecipeSchema` also checks what a file refers to, since it can be edited by hand.
- `importServiceRecipe` checks the names, the domains (of services and the dashboard) and the published host ports in the same transaction that creates everything, so nothing is created when one of them is taken. It returns every conflict.
- Imported services get new IDs. Secrets are created with an empty value.
- After an import, the services are deployed unless they have a secret or inherit one, those wait until the user fills them in. A domain whose zone isn't in Cloudflare is still imported, the domain sync marks it.
