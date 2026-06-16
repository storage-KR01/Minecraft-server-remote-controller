# RCON Design

The backend reads `server.properties` for:
- `enable-rcon`
- `rcon.port`
- `rcon.password`

RCON credentials never leave the backend and are never persisted.

The WebSocket gateway authenticates the browser session, checks RBAC, maps the requested runtime server id to the current discovered server, opens an internal RCON connection, forwards commands, and records audit events.

