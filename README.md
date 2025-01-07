<img src="https://raw.githubusercontent.com/omermecitoglu/buttler/main/src/assets/logo.png" alt="Jukebox Logo" width="150" height="150">

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
  - [Planned features](#planned-features)
  - [Known bugs](#known-bugs)
- [Requirements](#requirements)
- [Installation](#installation)
- [Usage](#usage)
- [Screenshots](#screenshots)
- [Contributing](#contributing)
- [License](#license)

## Overview

Buttler automates CI/CD workflows using Docker and GitHub webhooks

### Features

- Dark Mode ([see screenshots](#dark-mode))
- Mega.io integration to save database backups ([see screenshots](#settings))
- Hosting applications from a GitHub repository ([see screenshots](#custom-service))
  - must have a `Dockerfile` in its root directory
  - can be a private repo, but [ssh key](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent) of the hosting machine must be added to [Deploy keys](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/managing-deploy-keys)
  - Creates a new build image automatically via [GitHub webhooks](https://docs.github.com/en/webhooks/about-webhooks) and deploys it
- Database services ([see screenshots](#database-service))
  - Engines:
    - [PostgreSQL](https://www.postgresql.org)
    - [MySQL](https://www.mysql.com) *(not implemented yet)*
    - [MongoDB](https://www.mongodb.com) *(not implemented yet)*
    - [Redis](https://redis.io)
  - can be linked to other services ([see screenshots](#linking-services))
- Services dashboard ([see screenshots](#list-of-services))
- Edit service page ([see screenshots](#edit-service-page))
  - Manage service ports
  - Manage environment variables
  - Copy-paste env variables easily
- Service details page ([see screenshots](#service-details))
  - Container logs ([see screenshots](#container-logs))
  - List of build images ([see screenshots](#list-of-build-images))
  - Button fir triggering a manual build for custom services  ([see screenshots](#manual-build))
  - Button for triggering a manual backup for database services ([see screenshots](#manual-backup))
- Linking services ([see screenshots](#linking-services))
  - Creates private network between service containers
  - Custom service inherits necessary env variables automatically for the database ([see screenshots](#Auto-env-inheritance))

### Planned features

You can find the planned features [here](https://github.com/omermecitoglu/buttler/issues?q=is%3Aopen+is%3Aissue+label%3Aenhancement)

### Known bugs

You can see the known bugs [here](https://github.com/omermecitoglu/buttler/issues?q=is%3Aopen+is%3Aissue+label%3Abug)

## Requirements

To use `Buttler`, you'll need the following dependencies installed in your machine:

- [Node.js](https://nodejs.org) >= v19
- [NPM](https://www.npmjs.com)
- [Docker](https://www.docker.com)
- [SQLite](https://www.sqlite.org)

## Installation

Install `Buttler` globally using npm:

```bash
npm i -g @omer-x/buttler
```

## Usage

To launch the application

```bash
buttler start
```

Then open your browser and navigate to:

```arduino
http://localhost:2083
```

To terminate the application

```bash
buttler stop
```

To relaunch the application

```bash
buttler restart
```

## Screenshots

### Dark Mode

![Screenshot 01](https://raw.githubusercontent.com/omermecitoglu/buttler/main/screenshots/01.png)

### Settings

![Screenshot 02](https://raw.githubusercontent.com/omermecitoglu/buttler/main/screenshots/02.png)

### Custom service

![Screenshot 03](https://raw.githubusercontent.com/omermecitoglu/buttler/main/screenshots/03.png)

### Database service

![Screenshot 04](https://raw.githubusercontent.com/omermecitoglu/buttler/main/screenshots/04.png)

### List of services

![Screenshot 05](https://raw.githubusercontent.com/omermecitoglu/buttler/main/screenshots/05.png)

### Edit service page

![Screenshot 06](https://raw.githubusercontent.com/omermecitoglu/buttler/main/screenshots/06.png)

![Screenshot 07](https://raw.githubusercontent.com/omermecitoglu/buttler/main/screenshots/07.png)

### Service details

![Screenshot 10](https://raw.githubusercontent.com/omermecitoglu/buttler/main/screenshots/10.png)

### Manual Build

![Screenshot 08](https://raw.githubusercontent.com/omermecitoglu/buttler/main/screenshots/08.png)

### List of build images

![Screenshot 09](https://raw.githubusercontent.com/omermecitoglu/buttler/main/screenshots/09.png)

### Manual backup

![Screenshot 11](https://raw.githubusercontent.com/omermecitoglu/buttler/main/screenshots/11.png)

### Container logs

![Screenshot 12](https://raw.githubusercontent.com/omermecitoglu/buttler/main/screenshots/12.png)

### Linking services

![Screenshot 13](https://raw.githubusercontent.com/omermecitoglu/buttler/main/screenshots/13.png)

![Screenshot 14](https://raw.githubusercontent.com/omermecitoglu/buttler/main/screenshots/14.png)

### Auto env inheritance

![Screenshot 15](https://raw.githubusercontent.com/omermecitoglu/buttler/main/screenshots/15.png)

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any feature requests or bug fixes.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
