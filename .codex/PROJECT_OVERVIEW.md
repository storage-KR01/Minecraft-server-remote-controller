# Project Overview

Project: server-control-center

Goal: production-grade self-hosted Minecraft Server Control Center for Linux hosts running Minecraft through systemd.

The platform must be portable. A fresh VM should be able to clone the repository, configure secrets, start Docker Compose, discover Minecraft systemd services dynamically, and operate without source changes.

Core capabilities:
- Discover Minecraft servers from systemd units and service working directories.
- Manage whitelisted systemd operations.
- Connect to RCON using credentials read locally from `server.properties`.
- Provide authenticated web UI with RBAC.
- Record users, sessions, and audit logs in PostgreSQL only.
- Provide a disconnect workflow that stops a server, commits changed server files when needed, pushes to the discovered git remote and branch, and returns to selection.

Portability rule: never hardcode server paths, service names, branches, git remotes, IP addresses, domains, usernames, or Minecraft locations.

