# Changelog

## 2026-06-16

- Bootstrapped `.codex` project memory.
- Defined requirements, architecture, security, API, database, discovery, RCON, git backup, deployment, and troubleshooting docs.
- Added Docker Compose, Nginx, PostgreSQL schema init, NestJS backend scaffold, and Next.js/Tailwind frontend scaffold.
- Verified local backend and frontend production builds.
- Started Docker stack on local port `18080` after `8080` was already in use.
- Implemented persisted authentication foundation: admin bootstrap, BCrypt password hashes, sessions, JWT HttpOnly cookies, logout, `/auth/me`, password change, and RBAC guard primitives.
