# Changelog

## 2026-06-17

- Added host Nginx virtual host template for `scc.liems.io.vn`.
- Changed Docker Compose public gateway binding to support loopback-only publish with `PUBLIC_BIND_ADDRESS`.
- Updated local `.env` to bind the app gateway on `127.0.0.1:18080`.
- Installed and enabled `/etc/nginx/sites-available/scc.liems.io.vn`, reloaded host Nginx, and verified `Host: scc.liems.io.vn` returns the app.
- Verified forced public-IP resolution to this VPS (`34.143.217.9`) returns `200 OK`.
- Confirmed DNS for `scc.liems.io.vn` resolves to this VPS, issued a Let's Encrypt certificate, enabled HTTPS redirect, and verified `https://scc.liems.io.vn`.
- Verified Certbot renewal dry-run succeeds for both `dapm.liems.io.vn` and `scc.liems.io.vn`.
- Rewrote `README.md` with download, environment setup, deployment, HTTPS, verification, and operations instructions.

## 2026-06-16

- Bootstrapped `.codex` project memory.
- Defined requirements, architecture, security, API, database, discovery, RCON, git backup, deployment, and troubleshooting docs.
- Added Docker Compose, Nginx, PostgreSQL schema init, NestJS backend scaffold, and Next.js/Tailwind frontend scaffold.
- Verified local backend and frontend production builds.
- Started Docker stack on local port `18080` after `8080` was already in use.
- Implemented persisted authentication foundation: admin bootstrap, BCrypt password hashes, sessions, JWT HttpOnly cookies, logout, `/auth/me`, password change, and RBAC guard primitives.
