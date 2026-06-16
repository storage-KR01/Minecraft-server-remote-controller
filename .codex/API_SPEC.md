# API Spec

Base path: `/api`

## Auth

- `POST /auth/login` body `{ "username": string, "password": string }`
- `POST /auth/logout`
- `GET /auth/me`
- `POST /auth/change-password` body `{ "currentPassword": string, "newPassword": string }`

## Servers

- `GET /servers` returns discovered Minecraft servers.
- `GET /servers/:id/status` returns systemd status for a discovered server id.
- `POST /servers/:id/start`
- `POST /servers/:id/stop`
- `POST /servers/:id/restart`
- `POST /servers/:id/daemon-reload`
- `GET /servers/:id/journal?lines=200`
- `POST /servers/:id/disconnect`

Server ids are derived at runtime from discovery output and must not expose sensitive paths.

## Realtime

- `WS /ws/rcon` authenticated WebSocket namespace for live console.

