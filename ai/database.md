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
