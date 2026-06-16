# Server Control Center

Self-hosted Minecraft Server Control Center for Linux hosts running Minecraft through systemd.

## Quick Start

```sh
cp .env.example .env
docker compose up -d --build
docker compose logs backend
```

The backend will create the first admin account when no users exist and print the generated password to the backend logs.

## Project Memory

All durable project state lives in `.codex/`. A new development session should start by reading that directory and continuing from `.codex/NEXT_ACTION.md`.
