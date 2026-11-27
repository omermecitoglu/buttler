<img src="https://raw.githubusercontent.com/omermecitoglu/buttler/main/src/assets/logo.png" alt="Buttler Logo" width="150" height="150">

# Buttler

[![npm version](https://img.shields.io/npm/v/@omer-x/buttler?logo=npm&logoColor=CB3837&color=CB3837)](https://www.npmjs.com/package/@omer-x/buttler)
[![npm downloads](https://img.shields.io/npm/dm/@omer-x/buttler?logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIj48IS0tIUZvbnQgQXdlc29tZSBGcmVlIDYuNi4wIGJ5IEBmb250YXdlc29tZSAtIGh0dHBzOi8vZm9udGF3ZXNvbWUuY29tIExpY2Vuc2UgLSBodHRwczovL2ZvbnRhd2Vzb21lLmNvbS9saWNlbnNlL2ZyZWUgQ29weXJpZ2h0IDIwMjQgRm9udGljb25zLCBJbmMuLS0+PHBhdGggZD0iTTI4OCAzMmMwLTE3LjctMTQuMy0zMi0zMi0zMnMtMzIgMTQuMy0zMiAzMmwwIDI0Mi43LTczLjQtNzMuNGMtMTIuNS0xMi41LTMyLjgtMTIuNS00NS4zIDBzLTEyLjUgMzIuOCAwIDQ1LjNsMTI4IDEyOGMxMi41IDEyLjUgMzIuOCAxMi41IDQ1LjMgMGwxMjgtMTI4YzEyLjUtMTIuNSAxMi41LTMyLjggMC00NS4zcy0zMi44LTEyLjUtNDUuMyAwTDI4OCAyNzQuNyAyODggMzJ6TTY0IDM1MmMtMzUuMyAwLTY0IDI4LjctNjQgNjRsMCAzMmMwIDM1LjMgMjguNyA2NCA2NCA2NGwzODQgMGMzNS4zIDAgNjQtMjguNyA2NC02NGwwLTMyYzAtMzUuMy0yOC43LTY0LTY0LTY0bC0xMDEuNSAwLTQ1LjMgNDUuM2MtMjUgMjUtNjUuNSAyNS05MC41IDBMMTY1LjUgMzUyIDY0IDM1MnptMzY4IDU2YTI0IDI0IDAgMSAxIDAgNDggMjQgMjQgMCAxIDEgMC00OHoiIGZpbGw9IiMwMDc4MjAiIC8+PC9zdmc+&color=007820)](https://www.npmjs.com/package/@omer-x/buttler)
[![codecov](https://codecov.io/gh/omermecitoglu/buttler/branch/main/graph/badge.svg)](https://codecov.io/gh/omermecitoglu/buttler)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NDAgNTEyIj48IS0tIUZvbnQgQXdlc29tZSBGcmVlIDYuNi4wIGJ5IEBmb250YXdlc29tZSAtIGh0dHBzOi8vZm9udGF3ZXNvbWUuY29tIExpY2Vuc2UgLSBodHRwczovL2ZvbnRhd2Vzb21lLmNvbS9saWNlbnNlL2ZyZWUgQ29weXJpZ2h0IDIwMjQgRm9udGljb25zLCBJbmMuLS0+PHBhdGggZD0iTTM4NCAzMmwxMjggMGMxNy43IDAgMzIgMTQuMyAzMiAzMnMtMTQuMyAzMi0zMiAzMkwzOTguNCA5NmMtNS4yIDI1LjgtMjIuOSA0Ny4xLTQ2LjQgNTcuM0wzNTIgNDQ4bDE2MCAwYzE3LjcgMCAzMiAxNC4zIDMyIDMycy0xNC4zIDMyLTMyIDMybC0xOTIgMC0xOTIgMGMtMTcuNyAwLTMyLTE0LjMtMzItMzJzMTQuMy0zMiAzMi0zMmwxNjAgMCAwLTI5NC43Yy0yMy41LTEwLjMtNDEuMi0zMS42LTQ2LjQtNTcuM0wxMjggOTZjLTE3LjcgMC0zMi0xNC4zLTMyLTMyczE0LjMtMzIgMzItMzJsMTI4IDBjMTQuNi0xOS40IDM3LjgtMzIgNjQtMzJzNDkuNCAxMi42IDY0IDMyem01NS42IDI4OGwxNDQuOSAwTDUxMiAxOTUuOCA0MzkuNiAzMjB6TTUxMiA0MTZjLTYyLjkgMC0xMTUuMi0zNC0xMjYtNzguOWMtMi42LTExIDEtMjIuMyA2LjctMzIuMWw5NS4yLTE2My4yYzUtOC42IDE0LjItMTMuOCAyNC4xLTEzLjhzMTkuMSA1LjMgMjQuMSAxMy44bDk1LjIgMTYzLjJjNS43IDkuOCA5LjMgMjEuMSA2LjcgMzIuMUM2MjcuMiAzODIgNTc0LjkgNDE2IDUxMiA0MTZ6TTEyNi44IDE5NS44TDU0LjQgMzIwbDE0NC45IDBMMTI2LjggMTk1Ljh6TS45IDMzNy4xYy0yLjYtMTEgMS0yMi4zIDYuNy0zMi4xbDk1LjItMTYzLjJjNS04LjYgMTQuMi0xMy44IDI0LjEtMTMuOHMxOS4xIDUuMyAyNC4xIDEzLjhsOTUuMiAxNjMuMmM1LjcgOS44IDkuMyAyMS4xIDYuNyAzMi4xQzI0MiAzODIgMTg5LjcgNDE2IDEyNi44IDQxNlMxMS43IDM4MiAuOSAzMzcuMXoiIGZpbGw9IiNEMEE4MUMiIC8+PC9zdmc+)](https://opensource.org/licenses/MIT)
[![GitHub last commit](https://img.shields.io/github/last-commit/omermecitoglu/buttler?color=c977be&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA2NDAgNTEyIj48IS0tIUZvbnQgQXdlc29tZSBGcmVlIDYuNi4wIGJ5IEBmb250YXdlc29tZSAtIGh0dHBzOi8vZm9udGF3ZXNvbWUuY29tIExpY2Vuc2UgLSBodHRwczovL2ZvbnRhd2Vzb21lLmNvbS9saWNlbnNlL2ZyZWUgQ29weXJpZ2h0IDIwMjQgRm9udGljb25zLCBJbmMuLS0+PHBhdGggZD0iTTMyMCAzMzZhODAgODAgMCAxIDAgMC0xNjAgODAgODAgMCAxIDAgMCAxNjB6bTE1Ni44LTQ4QzQ2MiAzNjEgMzk3LjQgNDE2IDMyMCA0MTZzLTE0Mi01NS0xNTYuOC0xMjhMMzIgMjg4Yy0xNy43IDAtMzItMTQuMy0zMi0zMnMxNC4zLTMyIDMyLTMybDEzMS4yIDBDMTc4IDE1MSAyNDIuNiA5NiAzMjAgOTZzMTQyIDU1IDE1Ni44IDEyOEw2MDggMjI0YzE3LjcgMCAzMiAxNC4zIDMyIDMycy0xNC4zIDMyLTMyIDMybC0xMzEuMiAweiIgZmlsbD0iI0M5NzdCRSIgLz48L3N2Zz4=)](https://github.com/omermecitoglu/buttler/commits/main/)
[![GitHub issues](https://img.shields.io/github/issues/omermecitoglu/buttler?color=a38eed&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNiAxNiIgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2Ij4KICA8cGF0aCBkPSJNOCA5LjVhMS41IDEuNSAwIDEgMCAwLTMgMS41IDEuNSAwIDAgMCAwIDNaIiBmaWxsPSIjQTM4RUVEIj48L3BhdGg+CiAgPHBhdGggZD0iTTggMGE4IDggMCAxIDEgMCAxNkE4IDggMCAwIDEgOCAwWk0xLjUgOGE2LjUgNi41IDAgMSAwIDEzIDAgNi41IDYuNSAwIDAgMC0xMyAwWiIgZmlsbD0iI0EzOEVFRCI+PC9wYXRoPgo8L3N2Zz4=)](https://github.com/omermecitoglu/buttler/issues)
[![GitHub stars](https://img.shields.io/github/stars/omermecitoglu/buttler?style=social)](https://github.com/omermecitoglu/buttler)

## Table of Contents
- [Overview](#overview)
  - [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Setup](#setup)
- [GitHub App Setup](#github-app-setup)
  - [Option A: GitHub App Manifest Flow (Recommended)](#option-a-github-app-manifest-flow-recommended)
  - [Option B: Manual GitHub App Configuration](#option-b-manual-github-app-configuration)
  - [Installation Scope](#installation-scope)
  - [First Login](#first-login)
- [Usage](#usage)
- [Data and Secrets](#data-and-secrets)
- [Upgrading from v1](#upgrading-from-v1)
- [Contributing](#contributing)
- [License](#license)

## Overview

Buttler runs your apps on your own computer or server with Docker, and puts them on your domain through a Cloudflare tunnel. It builds GitHub repositories on every push, and runs images from Docker Hub.

Your computer doesn't need a public IP address or an open port, the tunnel is the only way in.

### Features

- **GitHub services**: a repository with a `Dockerfile` is built and deployed on every push to its branch, through the webhooks of a GitHub App. Private repositories work without deploy keys.
  - The Builds tab lists the builds with the commits between them.
  - Any of the last 5 builds can be deployed again without building, older images are removed.
- **Docker Hub services**: any image and tag, updated with the "Redeploy" button.
- **Deploys without downtime**: the old container keeps running until its replacement has started, and stays if the new one fails. Services with published ports or volumes have a short downtime while they are switched.
- **Domains**: the subdomains of your Cloudflare domains, with HTTPS at Cloudflare.
- **Isolated services**: every service has its own network, and can't reach the others unless they are linked. Internet access can be turned off per service.
- **Links**: a link lets two services reach each other by a stable address. A service can share variables, like its address or a password, and the linked services inherit them.
- **Environment variables**: for the build, the runtime or both. Secrets are encrypted, and are never build args.
- **Ports and volumes**: published host ports and Docker volumes.
- **Live logs**: of the containers and the builds.
- **Import and export**: services as recipes, without their secrets.
- **Users**: the admin lets other GitHub accounts in.

## Requirements

- [Node.js](https://nodejs.org) >= v22.5 and [npm](https://www.npmjs.com)
- [Docker](https://www.docker.com)
- A [Cloudflare](https://www.cloudflare.com) account with a domain
- A [GitHub](https://github.com) account, for the GitHub App that Buttler creates during the setup

## Installation

Install `Buttler` globally using npm:

```bash
npm i -g @omer-x/buttler
```

## Setup

Run `buttler start`, and open the link that it prints in a browser on the same computer.

1. **Connect Cloudflare**: approve the connection on Cloudflare. Buttler creates a tunnel in your account.
2. **Choose the domain**: type a subdomain and pick one of your domains. The setup continues there when the domain is reachable, otherwise you see the reason.
3. **Create the GitHub App**: its URLs use your domain. You can still choose another domain before this step.
4. **Log in with GitHub**: you become the admin.

An interrupted setup continues where it stopped, open the link again.

## GitHub App Setup

Buttler uses a GitHub App to log you in, to receive the push webhooks and to clone your repositories.

You can create the GitHub App with the manifest flow, or configure it yourself in the developer settings of GitHub.

### Option A: GitHub App Manifest Flow (Recommended)

1. In the third step of the [setup](#setup), choose a name (and an organization, if the app should belong to one) and continue to GitHub.
2. Create the app on GitHub, and install it on your account or organization.
3. Buttler receives and stores the credentials of the app.

### Option B: Manual GitHub App Configuration

1. Go to **GitHub Settings** > **Developer settings** > **GitHub Apps** > **New GitHub App** (or the settings of your organization).
2. Configure the app:
   - **Homepage URL**: `https://<your-domain>`, the domain that you chose in the setup.
   - **Callback URLs**: `https://<your-domain>/auth/github` and `http://localhost:7777/auth/github`, so you can log in without the tunnel too.
   - **Setup URL**: `https://<your-domain>/services/new`, with **Redirect on update** checked.
   - **Webhook URL**: `https://<your-domain>/webhooks/github`
   - **Webhook secret**: a random secret. Deliveries are rejected unless Buttler has the same one.
3. Permissions and events:
   - **Repository permissions**: **Contents** `Read-only` and **Metadata** `Read-only`.
   - **Subscribe to events**: **Push**.
4. Create the app, then generate a **private key** and a **client secret**.
5. In the third step of the setup, enter the **App ID**, the private key, the client secret and the webhook secret.

### Installation Scope

When you install the GitHub App on your account or organization:

- Choose **"Only select repositories"** rather than "All repositories", so Buttler can only read the repositories that you deploy with it.
- You can add or remove repositories at any time in the installation settings of the app.

### First Login

Everyone is denied by default. The person who opened the setup link and logs in becomes the **admin** of the instance.

> [!IMPORTANT]
> Whoever has the setup link can become the admin, so don't share it. It stops working after the first login. If you lose it, run `buttler start` again.

The admin can let other people in by adding their GitHub handles in **Settings**.

## Usage

| Command | |
|---------|---|
| `buttler start` | Starts Buttler in the background. It prints the setup link until the setup is complete, and the address of the dashboard (`http://localhost:7777`) afterwards. |
| `buttler stop` | Stops Buttler. The containers of your services keep running. |
| `buttler restart` | Stops and starts Buttler. |
| `buttler update` | Installs the latest version of the same channel (`latest` or `alpha`) and starts it again. If npm needs `sudo`, it prints the command instead. |
| `buttler version` | Prints the version, also `buttler -v`. |

The server log is at `~/.buttler/buttler.log`, the log of the previous start is `buttler.log.old`.

## Data and Secrets

Buttler keeps its data in `~/.buttler`:

- `database.sqlite`: the services, the users and the settings.
- `secret.key`: the key that encrypts the secrets in the database (secret variables, the credentials of the GitHub App and of Cloudflare, the session key). A copy of the database is not enough to get into your instance.
- `logs/builds`: the build logs.

> [!WARNING]
> Keep `secret.key` safe, and never store it together with a copy of the database. Without it, the secrets can't be decrypted. Buttler goes back to the setup (Cloudflare and the GitHub App), `buttler start` prints a new setup link for it, and the admin keeps the role. Secret variables have to be entered again.

Docker knows the rest: the containers, the images of the builds, the volumes and the networks are never copied into the database.

## Upgrading from v1

v2 is a clean install. It doesn't import anything from v1.

1. Stop v1 with `buttler stop`, in the directory where you started it.
2. Install v2 and run the [setup](#setup).
3. Create your services again. Docker Hub images and repositories are deployed the same way, but databases are ordinary Docker Hub services now, linked to the services that use them.

What happens to the data of v1:

- **The database of v1** (`buttler.db` and `PID` in the directory where you ran `buttler start`) is not read by v2. Delete it when you don't need it anymore.
- **The containers of v1** are not managed by v2, which only sees the containers that it created itself. They keep running, and keep their ports, because v1 created them with the `always` restart policy. Stop and remove them with `docker rm -f <name>` before v2 needs the same ports.
- **The volumes of v1** are kept. A storage mount of v2 can use one of them by typing its name, so a database keeps its data.
- **The images and networks of v1** are kept, remove them with Docker when you don't need them.
- **Backups**: v2 doesn't back up databases. Back up your volumes yourself.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any feature requests or bug fixes.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
