# Cloudflare Guide

## Connection

- Buttler connects to Cloudflare with OAuth (authorization code with PKCE). One client is shared by all instances, its ID is a constant in `src/core/cloudflare/oauth.ts`. There is no client secret.
- Cloudflare always returns to `http://localhost:7777/auth/cloudflare`, because the redirect URL must be registered exactly and the instances don't have a common domain. Connecting only works in a browser on the computer that Buttler runs on.
- The state and the PKCE verifier are in the session of the browser that started the connection. They can be used once, for 10 minutes.
- `localhost` doesn't have the session of the dashboard domain. A callback that wasn't started at `localhost` is passed to the same path of the domain, where the state is verified.
- `connectCloudflare` doesn't check who may connect. The callers do, the route needs the admin.

## Tokens

- They are in the `cloudflare_connection` setting, encrypted with the key file. They must never be cached, logged or sent to the browser, so only `getAccessToken` should be used. `null` instead of the tokens is a lost connection.
- A refresh replaces both tokens, and the old ones stop working right away. Everything that uses the tokens runs one after another (`src/core/cloudflare/connection.ts`), and the new ones are saved before they are used.
- The connection is only lost if Cloudflare answers with `invalid_grant`. It's kept if Cloudflare can't be reached.
- Tokens that were replaced or revoked are rejected with a 403, the same as a missing permission. `cloudflareFetch` gets a new token and tries once more.
- Disconnecting revokes the tokens before they are removed, so a failure can be tried again.

## API

- `GET /accounts` is empty with the scopes of Buttler. The account IDs are in the zones (`getZones`).
- The consent page lets the user choose accounts, but not zones.
