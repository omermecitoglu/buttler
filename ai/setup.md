# Setup Guide

## Setup Link

- The setup isn't complete until there is an admin. Until then there is a code in `~/.buttler/setup-code` (`src/core/setup-code.ts`), which `prepareSetup` creates at startup. It survives restarts, so an interrupted setup continues with the same link.
- `buttler start` prints the link (`/auth/setup?code=...`) when the server responds, and again if Buttler is already running. `npm run dev` prints it to the console.
- The route puts the code in the session, so it doesn't stay in the address bar. `isSetupSession` compares it with the file on every use.
- `requireSetup` protects the installation. The login only calls `claimAdmin` for a setup session, and deletes the code afterwards.
- An instance that is installed but has no admin needs the link too.
- The code is a secret, so it must not be written to the log.

## CLI

- `src/cli.ts` is bundled by tsdown into a single file, without the rest of the app. The modules that it shares with the server (`setup-code.ts`, `log-file.ts`, `storage.ts`) must not use `server-only` or the database.
- The output of `buttler start` goes to `~/.buttler/buttler.log`. The log of the previous start is kept as `buttler.log.old`.
- The server responds after `instrumentation.ts` is done, which may have to pull images. `buttler start` waits up to 5 minutes for it.
