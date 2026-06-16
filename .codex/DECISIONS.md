# Decisions

## 2026-06-16: Documentation-first bootstrap

Created project memory before implementation to satisfy interruption recovery and long-running development requirements.

## 2026-06-16: Runtime-discovered Minecraft servers

Minecraft service names, paths, branches, remotes, and RCON credentials will not be stored in PostgreSQL. They are discovered dynamically from systemd and local files.

## 2026-06-16: Minimal first scaffold

Initial code will establish Docker, backend, frontend, database schema, and module boundaries before deep implementation of host-specific systemd/RCON behavior.

