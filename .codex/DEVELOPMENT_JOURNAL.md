# Development Journal

## 2026-06-16

Started from an almost-empty repository. The attached request requires a production-grade Minecraft Server Control Center with mandatory project memory. Created the `.codex` directory first, then documented architecture and task decomposition before implementation.

Completed initial scaffold after documentation:
- Root Docker Compose, Nginx, PostgreSQL init, backend, and frontend were added.
- Backend and frontend production builds passed locally.
- Docker stack was built and started. Port `8080` was occupied, so the project default moved to `18080`.
- Backend initially crashed because of the `cookie-parser` CommonJS import shape; fixed by using `import cookieParser = require('cookie-parser')`.
- Frontend Docker build initially failed because `public/` was absent; fixed by adding `frontend/public/.gitkeep`.
- Added `.dockerignore` files after noticing the frontend Docker context included local build artifacts and dependencies.
- Implemented real auth foundation. The backend now creates the first admin if no users exist, prints the generated password to logs, stores BCrypt password hashes, persists sessions with token hashes, signs JWT session cookies, validates `/auth/me`, supports logout and password change, and provides RBAC guard primitives.
