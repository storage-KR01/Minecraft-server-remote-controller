# Security

## Auth

- JWT access token stored in HttpOnly cookie.
- Session records in PostgreSQL.
- BCrypt password hashes.
- First admin created on boot when no users exist.
- Generated initial admin password is printed to backend logs and must be changed on first login.

## Authorization

Roles:
- Admin: all operations, user management.
- Operator: server operations, RCON, disconnect workflow.
- Viewer: read-only status and logs.

## Controls

- Validate all request bodies.
- Use CSRF protection for cookie-authenticated mutating requests.
- Set secure headers at Nginx and backend.
- Rate-limit auth endpoints.
- Whitelist all systemd operations.
- Never pass arbitrary shell strings from users.
- Never expose PostgreSQL, backend internal ports, or RCON externally.

## Secrets

Secrets live in `.env`, never in source. RCON credentials are read from local Minecraft `server.properties` and never returned to clients.

