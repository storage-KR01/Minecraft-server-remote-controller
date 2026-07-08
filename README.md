# Server Control Center

Self-hosted Minecraft Server Control Center for Linux VPS hosts running Minecraft servers through `systemd`.

The production deployment uses Docker Compose for the app stack and the host Nginx as the public HTTPS reverse proxy.

## Current Domain

- Public URL: `https://scc.liems.io.vn`
- App gateway inside the VPS: `127.0.0.1:18080`
- Host Nginx proxies `scc.liems.io.vn` to the app gateway.

## Requirements

- A Linux VPS with `systemd`.
- DNS A record for the domain pointing to the VPS public IP.
- Docker Engine and Docker Compose plugin.
- Host Nginx installed and running.
- Certbot with the Nginx plugin for HTTPS.
- Git.
- Open inbound ports `80` and `443` in the VPS firewall/provider firewall.

Install common packages on Debian/Ubuntu:

```sh
sudo apt update
sudo apt install -y git nginx certbot python3-certbot-nginx docker.io docker-compose-plugin
sudo systemctl enable --now docker nginx
```

Add your user to the `docker` group if needed, then log out and back in:

```sh
sudo usermod -aG docker "$USER"
```

## Download

Clone the repository:

```sh
git clone https://github.com/storage-KR01/Minecraft-server-remote-controller.git server-control-center
cd server-control-center
```

## Environment Setup

Create the local environment file:

```sh
cp .env.example .env
```

Edit `.env` before production use:

```sh
nano .env
```

Important values:

```env
POSTGRES_PASSWORD=replace-with-a-strong-password
DATABASE_URL=postgresql://scc:replace-with-a-strong-password@postgres:5432/server_control_center
JWT_SECRET=replace-with-a-long-random-secret
COOKIE_SECRET=replace-with-another-long-random-secret
INITIAL_ADMIN_USERNAME=admin
PUBLIC_BIND_ADDRESS=127.0.0.1
PUBLIC_HTTP_PORT=18080
```

Generate strong secrets:

```sh
openssl rand -base64 48
```

Keep `PUBLIC_BIND_ADDRESS=127.0.0.1` when using host Nginx. This prevents the Docker gateway from being exposed directly to the internet.

## Start The App

Build and start the stack:

```sh
docker compose up -d --build
```

Check container status:

```sh
docker compose ps
```

Read the generated first-admin password from backend logs:

```sh
docker compose logs backend
```

The backend creates the first admin account only when the users table is empty. Change the generated password after the first login.

## Host Nginx Setup

Install the SCC virtual host without touching other sites such as `dapm.liems.io.vn`:

```sh
sudo install -m 0644 deploy/nginx/scc.liems.io.vn.conf /etc/nginx/sites-available/scc.liems.io.vn
sudo ln -sf /etc/nginx/sites-available/scc.liems.io.vn /etc/nginx/sites-enabled/scc.liems.io.vn
sudo nginx -t
sudo systemctl reload nginx
```

Verify HTTP before issuing HTTPS:

```sh
curl -I http://scc.liems.io.vn/
curl -s http://scc.liems.io.vn/api/health
```

## HTTPS

After DNS points to this VPS and HTTP works, issue the certificate:

```sh
sudo certbot --nginx -d scc.liems.io.vn
```

For non-interactive setup without an email:

```sh
sudo certbot --nginx -d scc.liems.io.vn --non-interactive --agree-tos --register-unsafely-without-email --redirect
```

Certbot installs auto-renewal. Test it with:

```sh
sudo certbot renew --dry-run
```

## Verification

Check the public site:

```sh
curl -I https://scc.liems.io.vn/
curl -s https://scc.liems.io.vn/api/health
```

Check that Nginx config is valid and running:

```sh
sudo nginx -t
systemctl is-active nginx
```

Check the Docker stack:

```sh
docker compose ps
```

## Operations

Start or update the stack:

```sh
docker compose up -d --build
```

Stop only the SCC Docker stack:

```sh
docker compose down
```

View logs:

```sh
docker compose logs -f
docker compose logs -f backend
docker compose logs -f frontend
```

Restart one service:

```sh
docker compose restart backend
docker compose restart frontend
docker compose restart nginx
```

Reload host Nginx after config changes:

```sh
sudo nginx -t
sudo systemctl reload nginx
```

Use reload instead of stop/start when other domains are hosted by the same Nginx service.

## Notes

- PostgreSQL is internal to Docker and is not exposed publicly.
- Backend and frontend ports are internal to Docker.
- The only public entrypoint should be host Nginx on ports `80` and `443`.
- Runtime Minecraft discovery is still pending; `/api/servers` can return an empty list until systemd discovery is implemented.
- Project memory for continuing development lives in `.codex/`.
