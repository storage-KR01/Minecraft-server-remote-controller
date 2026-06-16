# Snapshot: 2026-06-16 Scaffold Running

## Completed Work

- Created mandatory `.codex` memory.
- Added Docker Compose, `.env.example`, Nginx, PostgreSQL schema init, NestJS backend, and Next.js frontend.
- Added Docker ignore files.
- Built backend and frontend locally.
- Built and started Docker stack on `http://localhost:18080`.
- Implemented and verified auth foundation.

## Current Work

- Next feature slice is runtime systemd discovery.

## Next Work

- Add systemctl inspection and server.properties validation.
- Add parser tests.

## Architecture Summary

Nginx exposes frontend and `/api` only. Backend, frontend, and PostgreSQL live on an internal Docker network. PostgreSQL stores only security state. Minecraft server state remains runtime-discovered.

## Important Decisions

- Changed public default port from `8080` to `18080` because `8080` was already occupied locally.
- Kept current discovery result empty until real systemd inspection is implemented.

## Known Issues

- Discovery is not implemented yet.
- npm audit advisories need review.
- Host systemd operation strategy needs hardening.
- CSRF and rate limiting remain.

## Remaining Tasks

- See `.codex/TASKS_TODO.md`.
