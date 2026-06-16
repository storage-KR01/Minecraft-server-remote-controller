# Directory Discovery

Minecraft server directories are discovered from systemd unit metadata.

Process:
1. Enumerate candidate service units.
2. Read service definition and drop-ins.
3. Extract `WorkingDirectory`.
4. Verify the directory contains `server.properties`.
5. Parse `server.properties` for metadata.
6. Treat the server as a runtime-discovered resource.

No path is hardcoded. No path is persisted in PostgreSQL.

Future implementation note: support mounted host root prefixes so containers can map host paths safely without changing source code.

