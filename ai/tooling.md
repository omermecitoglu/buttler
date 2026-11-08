# Tooling & Verification

## Scripts

- **Development**: `npm run dev` starts the local Next.js development server using [Portless](https://github.com/vercel-labs/portless) (`portless run next dev`) for automatic `.localhost` domain routing without port conflicts.
- **Linting**: `npm run lint` uses ESLint with `--flag unstable_native_nodejs_ts_config`.
- **Testing**: `npm test` runs Vitest with V8 coverage.
