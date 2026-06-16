# Snapshot: 2026-06-16 Auth Foundation

## Completed Work

- Implemented first-admin bootstrap.
- Implemented BCrypt password verification.
- Implemented persisted sessions with token hashes.
- Implemented signed JWT session cookies.
- Implemented `/auth/login`, `/auth/logout`, `/auth/me`, and `/auth/change-password`.
- Added RBAC guard primitives and role decorators.
- Rebuilt backend image and verified auth through Nginx.

## Current Work

- Runtime Minecraft server discovery is next.

## Next Work

- Implement safe systemctl inspection.
- Parse systemd unit properties.
- Validate `WorkingDirectory` with `server.properties`.
- Return non-sensitive discovered server metadata.

## Architecture Summary

Auth security state lives in PostgreSQL. Minecraft server state remains dynamically discovered and is not persisted.

## Important Decisions

- Store session token hashes instead of raw session tokens.
- Keep generated first-admin password in backend logs only.
- Add RBAC primitives before adding mutable server operations.

## Known Issues

- CSRF protection and rate limiting are still pending.
- Auth tests are still pending.
- npm audit advisories need review.

## Remaining Tasks

- See `.codex/TASKS_TODO.md`.

