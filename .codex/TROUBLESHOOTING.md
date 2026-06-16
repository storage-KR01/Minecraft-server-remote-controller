# Troubleshooting

## No Servers Discovered

- Confirm Minecraft services are systemd services.
- Confirm each service has a valid `WorkingDirectory`.
- Confirm `server.properties` exists in the working directory.
- Confirm backend container can read systemd metadata and mapped directories.

## Auth Bootstrap Password Missing

- Check `docker compose logs backend`.
- If users already exist, no new password is generated.

## Systemd Operations Fail

- Confirm deployment grants backend or helper access to systemd.
- Confirm the requested operation is whitelisted.
- Check audit logs for denied actions.

