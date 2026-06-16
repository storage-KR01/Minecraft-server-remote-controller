# Deployment

Fresh deployment:

```sh
git clone <repository>
cd server-control-center
cp .env.example .env
docker compose up -d
docker compose logs backend
```

The backend runs migrations on startup and creates the first admin user when no users exist. The generated password appears in backend logs and must be changed.

## Host Requirements

- Linux with systemd.
- Docker and Docker Compose.
- Backend container must be allowed to inspect systemd and Minecraft server directories. Production deployment may require carefully mounted read-only host paths plus a constrained privileged helper for systemd operations.

## Network

- Public: Nginx HTTP/HTTPS only.
- Internal: frontend, backend, postgres.
- PostgreSQL and RCON are never exposed.

