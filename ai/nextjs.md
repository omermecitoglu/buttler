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
- The proxy doesn't run for `/api`, so route handlers must call `requireUser` themselves.

## In-Memory State

- Pages (with their server actions) and route handlers are bundled separately, so module-level variables are not shared between them. Use `getSharedState` (`src/core/shared-state.ts`) for in-memory state.

## Authorization

The proxy only redirects to the login page for convenience. Every entry point checks the access itself, through `src/core/auth.ts`:

- **Pages** in the base layout wrap their content in `<Suspense>` and `<Authorized>` (`adminOnly` if only the admin can open them). Layouts that read data need it too, but they don't cover their pages.
- **Route handlers** in `/api` start with `await requireUser()`, outside of any `try` block. Next.js responds with `401` or `403`.
- **Form actions** use `middlewares: [userMiddleware]`, or `adminMiddleware`. Middlewares are in `src/actions/middlewares/`, their files must not have `"use server"`. Other server actions start with `await requireUser()`.
- The installation starts with `await requireSetup()`, see `ai/setup.md`.

`src/core/auth-coverage.test.ts` finds the entry points by their location, and fails if one of them is left open. Exceptions are listed there.

## GitHub Login

- The login button is a plain link to `/auth/github/login`, which puts a random `state` in the session and redirects to GitHub. A route handler needs a full page load, so it's not a `<Link>`.
- `/auth/github` only exchanges the code if the `state` matches the one of the session. The state can be used once, for 10 minutes, so a login can't be started by another site.
- Every failure (an invalid or expired code, an error of GitHub, an unreachable GitHub) ends on the login page with an error, the reason is in the server log. Nothing is written to the session before the code is exchanged.
