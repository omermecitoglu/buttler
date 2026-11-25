# Cloudflare Guide

## Connection

- Buttler connects to Cloudflare with OAuth (authorization code with PKCE). One client is shared by all instances, its ID is a constant in `src/core/cloudflare/oauth.ts`. There is no client secret.
- Cloudflare always returns to `http://localhost:7777/auth/cloudflare`, because the redirect URL must be registered exactly and the instances don't have a common domain. Connecting only works in a browser on the computer that Buttler runs on.
- The state and the PKCE verifier are in the session of the browser that started the connection. They can be used once, for 10 minutes.
- `localhost` doesn't have the session of the dashboard domain. A callback that wasn't started at `localhost` is passed to the same path of the domain, where the state is verified.
- `connectCloudflare` doesn't check who may connect. The callers do, the route needs the setup or the admin.

## Tokens

- They are in the `cloudflare_connection` setting, encrypted with the key file. They must never be cached, logged or sent to the browser, so only `getAccessToken` should be used. `null` instead of the tokens is a lost connection.
- A refresh replaces both tokens, and the old ones stop working right away. Getting, refreshing and replacing them runs one after another (`src/core/cloudflare/connection.ts`), and the new ones are saved before they are used.
- The API requests aren't queued. A request whose token was replaced by a refresh is tried again by `cloudflareFetch`.
- The connection is only lost if Cloudflare answers with `invalid_grant`. It's kept if Cloudflare can't be reached.
- Tokens that were replaced or revoked are rejected with a 403, the same as a missing permission. `cloudflareFetch` gets a new token and tries once more.
- Disconnecting revokes the tokens before they are removed, so a failure can be tried again.

## Tunnel

- Buttler creates one tunnel, in one account (`src/core/cloudflare/tunnel.ts`). It's created after connecting if there is only one account, otherwise the admin chooses the account on the settings page. A tunnel that Buttler didn't create is never looked up or changed.
- The tunnel and its token are in the `cloudflare_tunnel` setting, encrypted like the tokens of the connection. It's saved right after it's created, so a setup that fails can be continued. Choosing another account deletes the previous tunnel first.
- `cloudflared` runs in the `buttler-cloudflared` container, which is the system service "Cloudflare Tunnel". The service only exists while there is a tunnel. `provisionTunnel` starts it at startup, and only needs the token, so the tunnel also runs while the connection is lost.
- Its network (`buttler-tunnel`) is only shared with Nginx, so it can't reach the services. It's not internal, because `cloudflared` connects to Cloudflare through it. Nginx is connected by `provisionReverseProxy` too, which may have replaced the container.
- The container has the label `buttler.tunnel-id`, and is replaced if it runs another tunnel. Containers without the label of Buttler are never replaced or removed.
- Disconnecting deletes the DNS records, removes the container, deletes the tunnel and then revokes the tokens. If the connection is lost, the tunnel and the records stay in the Cloudflare account.

## Domains

- `syncDomains` (`src/core/cloudflare/domains.ts`) makes Cloudflare match the domains in SQLite. It deletes the records of the domains that are gone, replaces the ingress rules of the tunnel, and then creates the missing records. It shares the queue of the tunnel, and reads the domains when it's its turn.
- It runs after a domain is added (after Nginx serves it) or removed (before Nginx stops serving it), before and after a service with domains is deleted, after the tunnel is set up, and at startup.
- It never throws. What couldn't be done is saved in `dns_records` with the reason, and shown with the domain. A removed domain isn't served anymore even if Cloudflare can't be reached, its record is listed in the settings until it's deleted.
- Failures of Cloudflare are tried again automatically, with delays from 1 to 30 minutes. A lost connection, a missing zone and a hostname that is taken need the user, so they are only tried again by the next sync.
- Only records with a known ID are changed or removed. A record with the comment of Buttler that points to its tunnel is one that couldn't be saved, so it's used too.
- A hostname with other `A`, `AAAA` or `CNAME` records is taken. They are only replaced if the user agrees, and if they are still the ones that were shown. The other types, like `TXT`, stay next to the record of the tunnel. A record that replaced others belongs to Buttler, so it's deleted with its domain.
- The zone is the most specific one that the hostname belongs to, in the account of the tunnel. It isn't a part of the domain, so domains from before Cloudflare was connected work too.
- Records that are in sync are only looked up by `verify`, which is used at startup, for retries, and by the "Try again" button. Records of Buttler that were changed in Cloudflare are repaired.
- Every ingress rule leads to Nginx, which finds the service by the hostname. There are no wildcards.

## API

- `GET /accounts` is empty with the scopes of Buttler. The account IDs are in the zones (`getZones`).
- The consent page lets the user choose accounts, but not zones.
