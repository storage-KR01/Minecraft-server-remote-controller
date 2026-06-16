# Requirements

## Functional

- Login, logout, password change, JWT sessions through HttpOnly cookies.
- Roles: Admin, Operator, Viewer.
- Audit all sensitive actions.
- Discover Minecraft servers through systemd inspection.
- Show server status and metadata derived from local files.
- Support systemd `daemon-reload`, `start`, `stop`, `restart`, `status`, and journal reads through explicit whitelists.
- Provide live RCON console over WebSocket without exposing RCON credentials.
- Disconnect workflow:
  1. Stop server.
  2. Verify stopped.
  3. Detect git repository from server working directory.
  4. `git add .`.
  5. Commit only when changes exist.
  6. Detect current branch.
  7. Detect current remote.
  8. Push.
  9. Return to server selection.

## Non-Functional

- Portable across Linux hosts with systemd and Docker.
- Secrets configured through environment variables.
- No source modification required after clone.
- Backend internal ports must not be exposed publicly.
- PostgreSQL and RCON must not be public.
- All external traffic flows through Nginx.

## Data Storage Rules

PostgreSQL stores only users, sessions, and audit logs.

PostgreSQL must not store Minecraft configs, service names, paths, RCON passwords, or player data.

