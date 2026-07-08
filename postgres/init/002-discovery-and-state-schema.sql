CREATE TABLE IF NOT EXISTS servers (
  id text PRIMARY KEY,
  path text NOT NULL,
  display_name text NOT NULL,
  game_port integer,
  rcon_port integer,
  rcon_password_enc text,
  systemd_unit text NOT NULL UNIQUE,
  last_scanned_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS system_state (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  active_server_id text REFERENCES servers(id) ON DELETE SET NULL,
  lock_mode text NOT NULL DEFAULT 'locked' CHECK (lock_mode IN ('locked', 'unlocked')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO system_state (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

CREATE INDEX IF NOT EXISTS servers_last_scanned_at_idx ON servers(last_scanned_at DESC);
CREATE INDEX IF NOT EXISTS servers_systemd_unit_idx ON servers(systemd_unit);
CREATE INDEX IF NOT EXISTS system_state_active_server_id_idx ON system_state(active_server_id);