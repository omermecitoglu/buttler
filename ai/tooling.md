# Tooling & Verification

## Scripts

- **Development**: `npm run dev` starts the Next.js development server on port 7777, the same port as `buttler start`, so they can't run at the same time.
- **Linting**: `npm run lint` uses ESLint with `--flag unstable_native_nodejs_ts_config`.
- **Testing**: `npm test` runs Vitest with V8 coverage.

## Testing Principles

- **No Tests for Models & Schemas**: Do not write unit tests for Drizzle ORM models, DTOs, or schema definitions (`src/models/*`). Tests should focus on business operations, core utilities, and API route handlers.


## Packaging

- `npm run build` writes the CLI to `bin/` and the standalone server to `ui/`. `ui/node_modules` is removed, the server uses the dependencies of the installed package. Packages that Next.js bundles into the server don't have to be in `dependencies`.
- Dependencies must be in the registry of npm. The ones from JSR can only be `devDependencies`, because the users don't have our `.npmrc`.
- Next.js loads the packages in `serverExternalPackages` by names with a hash, through symlinks in `.next/node_modules`. npm doesn't include symlinks, so `copyfiles` follows them (`-F`) and copies the packages to `ui/`.
- The release workflow installs the package and starts it before it's published.
