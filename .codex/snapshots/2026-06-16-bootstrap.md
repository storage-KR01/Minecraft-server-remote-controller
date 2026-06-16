# Snapshot: 2026-06-16 Bootstrap

## Completed Work

- Read request.
- Confirmed project root exists.
- Created `.codex` memory structure and core documentation.
- Added Docker/Nest/Next/PostgreSQL/Nginx scaffold.
- Verified builds and running Docker stack.

## Current Work

- Preparing next auth implementation slice.

## Next Work

- Implement real auth, then discovery, RCON, and disconnect workflows.

## Architecture Summary

Next.js frontend and NestJS backend run behind Nginx. PostgreSQL stores only users, sessions, and audit logs. Minecraft servers are discovered dynamically from systemd and `server.properties`.

## Important Decisions

- Documentation first.
- Runtime discovery instead of persisted Minecraft server records.
- No hardcoded server paths, service names, branches, or remotes.

## Known Issues

- Systemd access from containers needs production hardening.
- Auth and discovery are placeholders.
- Dependency audit advisories need triage.

## Remaining Tasks

- See `.codex/TASKS_TODO.md`.
