# Tooling & Verification

## Scripts

- **Development**: `npm run dev` starts the Next.js development server on port 7777, the same port as `buttler start`, so they can't run at the same time.
- **Linting**: `npm run lint` uses ESLint with `--flag unstable_native_nodejs_ts_config`.
- **Testing**: `npm test` runs Vitest with V8 coverage.

## Testing Principles

- **No Tests for Models & Schemas**: Do not write unit tests for Drizzle ORM models, DTOs, or schema definitions (`src/models/*`). Tests should focus on business operations, core utilities, and API route handlers.

