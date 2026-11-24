# Next.js & Turbopack Guidelines

## Turbopack Compatibility

- Next.js 16 uses Turbopack by default.
- Custom `webpack` configurations should be avoided or migrated to Turbopack-compatible configuration options.
- External server packages (such as `dockerode`) must be defined using `serverExternalPackages` in `next.config.ts`:

```ts
const nextConfig: NextConfig = {
  serverExternalPackages: ["dockerode"],
  // ...
};
```

## Form Server Actions

- All form-based server actions must use `@omer-x/next-form-actions`.

### Action File Naming Conventions

- Server action files in `src/actions/` are named by domain entity: `src/actions/[entity].ts` (e.g. `service.ts` for service actions, `session.ts` for session actions, `user.ts` for user actions).
- Think of `actions/xxxx.ts` as "xxxx actions".

## Data Fetching

- Do not use server actions for fetching data; use API route handlers (`src/app/api/...`).

## In-Memory State

- Pages (with their server actions) and route handlers are bundled separately, so module-level variables are not shared between them. Use `getSharedState` (`src/core/shared-state.ts`) for in-memory state.
