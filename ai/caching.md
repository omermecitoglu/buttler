# Caching & Cache Tagging Guidelines

## Invalidation Rules

- **Never use `revalidatePath`**: Always use `updateTag` and `revalidateTag`.
  - Use `updateTag` when you want immediate purging and instant read-your-own-writes (e.g. in server actions directly following a database mutation before redirecting or re-rendering).
  - Use `revalidateTag` for background revalidation.
  - See [Next.js updateTag documentation](https://nextjs.org/docs/app/api-reference/functions/updateTag#when-to-use-updatetag) for more details.

## Tag Naming Conventions

Cache tags must strictly mirror the function name and its argument signatures:

```ts
export async function functionName(param1, param2, param3) {
  "use cache";
  cacheTag(`functionName(${param1}, ${param2}, ${param3})`);
  return ...;
}
```

For parameterless functions (e.g. queries that fetch all records):

```ts
export async function getAllServices() {
  "use cache";
  cacheTag("getAllServices()");
  return ...;
}
```

## Group Invalidation via Wildcard `(...)` Tags

For functions that fetch individual items by identifier, tag both the specific call and a group wildcard tag `(...)`:

```ts
export async function getItem(itemId) {
  "use cache";
  cacheTag(`getItem(${itemId})`);
  cacheTag("getItem(...)");
  return ...;
}
```

- To invalidate a specific item:
  ```ts
  updateTag(`getItem(${itemId})`);
  ```
- To invalidate all item caches at once:
  ```ts
  updateTag("getItem(...)");
  ```
