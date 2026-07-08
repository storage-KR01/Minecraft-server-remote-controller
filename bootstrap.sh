#!/usr/bin/env bash
set -euo pipefail

# Server Control Center bootstrap
#
# Environment:
# - Language: TypeScript
# - Backend framework: NestJS
# - Frontend framework: Next.js 15 (App Router) + React 19 + Tailwind CSS 3
# - Runtime: PostgreSQL + Docker Compose
#
# Workspace location:
# - This script lives in the repository root and auto-cd's there before deploying.
#
# Deploy command:
# - docker compose up -d --build
#
# Usage:
# - bash bootstrap.sh
#
# Optional public reverse-proxy setup remains documented in README.md.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

info() {
  printf '[bootstrap] %s\n' "$1"
}

fail() {
  printf '[bootstrap] ERROR: %s\n' "$1" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing required command: $1"
}

generate_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 32
  else
    tr -dc 'a-f0-9' </dev/urandom | head -c 64
    printf '\n'
  fi
}

get_env_value() {
  local key="$1"
  awk -F= -v key="$key" '$1 == key { sub(/^[^=]*=/, ""); print; exit }' .env
}

set_env_value() {
  local key="$1"
  local value="$2"
  local tmp
  tmp="$(mktemp)"
  awk -v key="$key" -v value="$value" '
    BEGIN { found = 0 }
    $0 ~ "^" key "=" { print key "=" value; found = 1; next }
    { print }
    END { if (!found) print key "=" value }
  ' .env > "$tmp"
  mv "$tmp" .env
}

ensure_env_file() {
  if [[ ! -f .env ]]; then
    [[ -f .env.example ]] || fail "Missing .env and .env.example"
    info "Creating .env from .env.example"
    cp .env.example .env
  fi
}

normalize_env() {
  local postgres_db postgres_user postgres_password database_url jwt_secret cookie_secret data_key app_name bind_address http_port search_roots scan_depth backup_repo backup_prefix

  postgres_db="$(get_env_value POSTGRES_DB || true)"
  postgres_user="$(get_env_value POSTGRES_USER || true)"
  postgres_password="$(get_env_value POSTGRES_PASSWORD || true)"
  database_url="$(get_env_value DATABASE_URL || true)"
  jwt_secret="$(get_env_value JWT_SECRET || true)"
  cookie_secret="$(get_env_value COOKIE_SECRET || true)"
  data_key="$(get_env_value DATA_ENCRYPTION_KEY || true)"
  app_name="$(get_env_value NEXT_PUBLIC_APP_NAME || true)"
  bind_address="$(get_env_value PUBLIC_BIND_ADDRESS || true)"
  http_port="$(get_env_value PUBLIC_HTTP_PORT || true)"
  search_roots="$(get_env_value MC_SEARCH_ROOTS || true)"
  scan_depth="$(get_env_value MC_SCAN_MAX_DEPTH || true)"
  backup_repo="$(get_env_value GIT_BACKUP_REPO_PATH || true)"
  backup_prefix="$(get_env_value GIT_BACKUP_COMMIT_PREFIX || true)"

  [[ -n "$postgres_db" && "$postgres_db" != "server_control_center" ]] || postgres_db="server_control_center"
  [[ -n "$postgres_user" && "$postgres_user" != "scc" ]] || postgres_user="scc"
  [[ -n "$postgres_password" && "$postgres_password" != "change-me" ]] || postgres_password="$(generate_secret)"
  [[ -n "$jwt_secret" && "$jwt_secret" != replace-with-* ]] || jwt_secret="$(generate_secret)"
  [[ -n "$cookie_secret" && "$cookie_secret" != replace-with-* ]] || cookie_secret="$(generate_secret)"
  [[ -n "$data_key" && "$data_key" != replace-with-* ]] || data_key="$(generate_secret)"
  [[ -n "$app_name" ]] || app_name="Server Control Center"
  [[ -n "$bind_address" ]] || bind_address="127.0.0.1"
  [[ -n "$http_port" ]] || http_port="18080"
  [[ -n "$search_roots" ]] || search_roots="/host/home,/host/opt,/host/srv"
  [[ -n "$scan_depth" ]] || scan_depth="6"
  [[ -n "$backup_repo" ]] || backup_repo="/workspace/server-control-center"
  [[ -n "$backup_prefix" ]] || backup_prefix="scc backup"

  set_env_value POSTGRES_DB "$postgres_db"
  set_env_value POSTGRES_USER "$postgres_user"
  set_env_value POSTGRES_PASSWORD "$postgres_password"
  set_env_value DATABASE_URL "postgresql://${postgres_user}:${postgres_password}@postgres:5432/${postgres_db}"
  set_env_value JWT_SECRET "$jwt_secret"
  set_env_value COOKIE_SECRET "$cookie_secret"
  set_env_value INITIAL_ADMIN_USERNAME "$(get_env_value INITIAL_ADMIN_USERNAME || true)"
  if [[ -z "$(get_env_value INITIAL_ADMIN_USERNAME || true)" ]]; then
    set_env_value INITIAL_ADMIN_USERNAME "admin"
  fi
  set_env_value NEXT_PUBLIC_APP_NAME "$app_name"
  set_env_value BACKEND_PORT "3001"
  set_env_value FRONTEND_PORT "3000"
  set_env_value PUBLIC_BIND_ADDRESS "$bind_address"
  set_env_value PUBLIC_HTTP_PORT "$http_port"
  set_env_value MC_SEARCH_ROOTS "$search_roots"
  set_env_value MC_SCAN_MAX_DEPTH "$scan_depth"
  set_env_value DATA_ENCRYPTION_KEY "$data_key"
  set_env_value GIT_BACKUP_REPO_PATH "$backup_repo"
  set_env_value GIT_BACKUP_COMMIT_PREFIX "$backup_prefix"
}

main() {
  require_command docker
  docker compose version >/dev/null 2>&1 || fail "Docker Compose plugin is not available"

  ensure_env_file
  normalize_env

  info "Validating compose configuration"
  docker compose config >/dev/null

  info "Deploying stack"
  docker compose up -d --build

  info "Stack status"
  docker compose ps

  info "Health check"
  if docker compose exec -T backend sh -lc 'wget -qO- http://localhost:3001/api/health >/dev/null'; then
    info "Backend health endpoint is responding"
  else
    info "Backend health check could not be run inside the container yet"
  fi

  info "Done"
  info "If you want public HTTPS access, follow deploy/nginx/scc.liems.io.vn.conf and README.md"
}

main "$@"
