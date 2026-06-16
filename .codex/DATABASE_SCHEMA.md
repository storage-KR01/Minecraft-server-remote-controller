# Database Schema

PostgreSQL stores application security state only.

## users

- `id uuid primary key`
- `username text unique not null`
- `password_hash text not null`
- `role text not null`
- `must_change_password boolean not null default true`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

## sessions

- `id uuid primary key`
- `user_id uuid references users(id) on delete cascade`
- `token_hash text not null`
- `expires_at timestamptz not null`
- `created_at timestamptz not null default now()`
- `revoked_at timestamptz`

## audit_logs

- `id bigserial primary key`
- `actor_user_id uuid references users(id) on delete set null`
- `action text not null`
- `target_type text not null`
- `target_id text`
- `metadata jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null default now()`

