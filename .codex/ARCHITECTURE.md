# Architecture

## Stack

- Frontend: Next.js, TypeScript, TailwindCSS
- Backend: NestJS, TypeScript
- Database: PostgreSQL
- Realtime: WebSocket gateway
- Proxy: Nginx
- Container: Docker and Docker Compose

## Services

- `frontend`: Next.js UI. Calls backend through `/api` and WebSocket paths exposed by Nginx.
- `backend`: NestJS API. Owns auth, audit, discovery orchestration, systemd, RCON, and git-backup workflows.
- `postgres`: internal database for users, sessions, and audit logs.
- `nginx`: public entrypoint, serves frontend and proxies backend API/WebSocket.

## Backend Modules

- `AuthModule`: login/logout/session/RBAC/password-change.
- `AuditModule`: append-only security and operation events.
- `DiscoveryModule`: scans systemd and validates Minecraft server directories.
- `SystemdModule`: whitelisted operations and journal access.
- `RconModule`: internal RCON connections and WebSocket console.
- `GitBackupModule`: disconnect workflow and dynamic branch/remote detection.
- `HealthModule`: readiness endpoints.

## Runtime Discovery

The backend reads systemd unit metadata at request time or through short-lived cache. Discovered Minecraft servers are runtime objects, not persisted records.

