export type SessionUser = {
  id: string;
  username: string;
  role: 'Admin' | 'Operator' | 'Viewer';
  mustChangePassword: boolean;
};

export type ServerRecord = {
  id: string;
  path: string;
  displayName: string;
  gamePort: number | null;
  rconPort: number | null;
  systemdUnit: string;
  lastScannedAt: string;
  hasServerProperties: boolean;
  hasEula: boolean;
  hasControllerMeta: boolean;
  hasSystemdUnit: boolean;
};

export type ServerState = {
  active_server_id: string | null;
  lock_mode: 'locked' | 'unlocked';
  updated_at: string;
};

const API_BASE = '';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {})
    },
    ...init
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function login(username: string, password: string) {
  return request<{ user: SessionUser }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
}

export async function logout() {
  return request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' });
}

export async function me() {
  return request<{ authenticated: boolean; user: SessionUser }>('/api/auth/me');
}

export async function getServers() {
  return request<{ servers: ServerRecord[] }>('/api/servers');
}

export async function getServer(id: string) {
  return request<{ server: ServerRecord }>('/api/servers/' + encodeURIComponent(id));
}

export async function getActive() {
  return request<{ state: ServerState; server: ServerRecord | null }>('/api/servers/active');
}

export async function rescanServers() {
  return request<{ servers: ServerRecord[] }>('/api/servers/rescan', { method: 'POST' });
}

export async function startServer(id: string) {
  return request<{ status: string; serverId: string; systemdUnit: string }>('/api/servers/' + encodeURIComponent(id) + '/start', {
    method: 'POST'
  });
}

export async function stopServer(id: string) {
  return request<{ status: string; serverId: string; systemdUnit: string }>('/api/servers/' + encodeURIComponent(id) + '/stop', {
    method: 'POST'
  });
}

export async function restartServer(id: string) {
  return request<{ status: string; serverId: string; systemdUnit: string }>('/api/servers/' + encodeURIComponent(id) + '/restart', {
    method: 'POST'
  });
}

export async function getServerStatus(id: string) {
  return request<{ serverId: string; systemdUnit: string; stdout: string; stderr: string; exitCode: number }>('/api/servers/' + encodeURIComponent(id) + '/status');
}

export async function getJournal(id: string, lines = 120) {
  return request<{ serverId: string; systemdUnit: string; lines: number; output: string }>('/api/servers/' + encodeURIComponent(id) + '/journal?lines=' + String(lines));
}

export async function getPlayers(id: string) {
  return request<{ serverId: string; output: string }>('/api/servers/' + encodeURIComponent(id) + '/players');
}

export async function kickPlayer(id: string, player: string, reason?: string) {
  return request<{ ok: boolean; serverId: string; output: string }>('/api/servers/' + encodeURIComponent(id) + '/players/' + encodeURIComponent(player) + '/kick', {
    method: 'POST',
    body: JSON.stringify({ reason })
  });
}

export async function banPlayer(id: string, player: string, reason?: string) {
  return request<{ ok: boolean; serverId: string; output: string }>('/api/servers/' + encodeURIComponent(id) + '/players/' + encodeURIComponent(player) + '/ban', {
    method: 'POST',
    body: JSON.stringify({ reason })
  });
}

export async function pardonPlayer(id: string, player: string) {
  return request<{ ok: boolean; serverId: string; output: string }>('/api/servers/' + encodeURIComponent(id) + '/players/' + encodeURIComponent(player) + '/pardon', {
    method: 'POST'
  });
}
