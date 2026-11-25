# Setup Guide

## Setup Link

- The setup isn't complete until there is an admin. Until then there is a code in `~/.buttler/setup-code` (`src/core/setup-code.ts`), which `prepareSetup` creates at startup. It survives restarts, so an interrupted setup continues with the same link.
- `buttler start` prints the link (`/auth/setup?code=...`) when the server responds, and again if Buttler is already running. `npm run dev` prints it to the console.
- The route puts the code in the session, so it doesn't stay in the address bar. `isSetupSession` compares it with the file on every use.
- The domain doesn't share the session with `localhost`, so the browser moves there with the link of the domain.
- The session cookie isn't `secure` at loopback addresses, because Safari would reject it without HTTPS.
- `requireSetup` protects the installation. `requireSetupOrAdmin` is for what the setup shares with the settings, it only lets the setup in until the GitHub App is created. The login only calls `claimAdmin` for a setup session, and deletes the code afterwards.
- An instance that is installed but has no admin needs the link too.
- The code is a secret, so it must not be written to the log.

## Steps

- Connect Cloudflare, choose the domain, create the GitHub App, log in. Cloudflare is required, in development too.
- `getSetupProgress` (`src/core/setup-progress.ts`) finds the step from what is there. Nothing is saved for it, so an interrupted setup continues where it stopped, and goes back if something doesn't work anymore.
- The domain can be changed until the GitHub App is created, but only at `localhost`, because the old domain isn't served anymore afterwards.
- `checkReachability` requests `/auth/instance` through the domain, which returns an ID of this process. The route only exists during the setup.
- The check asks the name servers of the zone for the address. The resolver of the computer, which the browser uses too, may remember for a long time that the hostname doesn't exist, so it must not be asked too early.
- The manifest and the manual form only get the saved domain, never the address of the browser. The app also has the callback URL of `localhost`, so the login works without the tunnel.
- The domain that the app was created with is in the `github_app_domain` setting. The settings show the URLs of the app if the domain is another one.

## CLI

- `src/cli.ts` is bundled by tsdown into a single file, without the rest of the app. The modules that it shares with the server (`setup-code.ts`, `log-file.ts`, `storage.ts`) must not use `server-only` or the database.
- The output of `buttler start` goes to `~/.buttler/buttler.log`. The log of the previous start is kept as `buttler.log.old`.
- The server responds after `instrumentation.ts` is done, which may have to pull images. `buttler start` waits up to 5 minutes for it.
