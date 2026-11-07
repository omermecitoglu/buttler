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
