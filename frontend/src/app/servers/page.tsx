'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  getActive,
  getServers,
  logout,
  me,
  rescanServers,
  restartServer,
  startServer,
  stopServer,
  type ServerRecord,
  type SessionUser
} from '../../lib/api';
import { Activity, Database, LockKeyhole, Power, RotateCcw, ShieldCheck, Server, Terminal } from 'lucide-react';

type ActiveInfo = Awaited<ReturnType<typeof getActive>>;

const statusItems = [
  { label: 'Discovery', icon: Server },
  { label: 'Database', icon: Database },
  { label: 'Security', icon: ShieldCheck }
];

function formatPort(port: number | null) {
  return port ? String(port) : 'n/a';
}

export default function ServersPage() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [active, setActive] = useState<ActiveInfo | null>(null);
  const [servers, setServers] = useState<ServerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setActionError(null);

    try {
      const [meResult, activeResult, serversResult] = await Promise.all([me(), getActive(), getServers()]);
      setUser(meResult.user);
      setActive(activeResult);
      setServers(serversResult.servers);
    } catch {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const activeServerId = active?.state.active_server_id ?? null;

  const liveCount = useMemo(() => servers.length, [servers]);

  async function handleRescan() {
    setActionBusy('rescan');
    setActionError(null);
    try {
      const result = await rescanServers();
      setServers(result.servers);
      const activeResult = await getActive();
      setActive(activeResult);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Rescan failed');
    } finally {
      setActionBusy(null);
    }
  }

  async function handleLogout() {
    await logout();
    router.push('/login');
  }

  async function handleStart(id: string) {
    setActionBusy(`start:${id}`);
    setActionError(null);
    try {
      await startServer(id);
      await refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Start failed');
    } finally {
      setActionBusy(null);
    }
  }

  async function handleStop(id: string) {
    setActionBusy(`stop:${id}`);
    setActionError(null);
    try {
      await stopServer(id);
      await refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Stop failed');
    } finally {
      setActionBusy(null);
    }
  }

  async function handleRestart(id: string) {
    setActionBusy(`restart:${id}`);
    setActionError(null);
    try {
      await restartServer(id);
      await refresh();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Restart failed');
    } finally {
      setActionBusy(null);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(47,125,87,0.16),_transparent_35%),linear-gradient(180deg,#eef1ea_0%,#f7f8f5_100%)] text-ink">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-5 sm:px-8">
        <header className="flex flex-col gap-4 border-b border-line pb-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">Signed in as {user?.username ?? '...'}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Server Control Center</h1>
            <p className="mt-1 max-w-2xl text-sm text-ink/70">
              Runtime-discovered Minecraft operations for Linux systemd hosts.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleRescan} className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-white px-4 text-sm font-medium shadow-sm transition hover:border-accent" type="button">
              <RotateCcw size={16} />
              {actionBusy === 'rescan' ? 'Rescanning...' : 'Rescan'}
            </button>
            <button onClick={handleLogout} className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-white px-4 text-sm font-medium shadow-sm transition hover:border-accent" type="button">
              Sign out
            </button>
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-3">
          {statusItems.map((item) => {
            const Icon = item.icon;
            const value = item.label === 'Discovery' ? `${liveCount} discovered servers` : item.label === 'Database' ? 'users, sessions, audit_logs, servers, system_state' : 'cookie session + RBAC + audit';
            return (
              <div key={item.label} className="rounded-2xl border border-line bg-white/80 p-4 shadow-[0_10px_40px_rgba(23,32,27,0.06)] backdrop-blur">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/55">{item.label}</p>
                    <p className="mt-1 text-sm font-medium text-ink">{value}</p>
                  </div>
                  <Icon className="text-accent" size={20} />
                </div>
              </div>
            );
          })}
        </section>

        {actionError ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{actionError}</div> : null}

        <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="overflow-hidden rounded-3xl border border-line bg-white shadow-[0_24px_70px_rgba(23,32,27,0.08)]">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 className="text-sm font-semibold text-ink">Discovered Servers</h2>
              <span className="rounded-full bg-panel px-3 py-1 text-xs text-ink/65">{servers.length} records</span>
            </div>

            {loading ? (
              <div className="flex min-h-80 items-center justify-center px-6 text-center text-sm text-ink/65">Loading...</div>
            ) : servers.length === 0 ? (
              <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
                <Activity className="text-accent" size={28} />
                <p className="mt-3 text-base font-medium text-ink">No runtime scan results yet</p>
                <p className="mt-1 max-w-md text-sm text-ink/65">
                  The backend is connected. Run rescan to discover mc-server-* folders on the host.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-line">
                {servers.map((server) => {
                  const isActive = activeServerId === server.id;
                  return (
                    <div key={server.id} className="grid gap-4 px-4 py-4 md:grid-cols-[1fr_auto] md:items-center">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Link className="text-base font-semibold text-ink hover:text-accent" href={`/servers/${encodeURIComponent(server.id)}`}>
                            {server.displayName}
                          </Link>
                          <span className="rounded-full bg-panel px-2 py-1 text-[11px] uppercase tracking-[0.18em] text-ink/60">{server.systemdUnit}</span>
                          {isActive ? <span className="rounded-full bg-accent/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">active</span> : null}
                        </div>
                        <p className="mt-1 text-sm text-ink/65">{server.path}</p>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-ink/60">
                          <span className="rounded-full bg-panel px-2 py-1">Game {formatPort(server.gamePort)}</span>
                          <span className="rounded-full bg-panel px-2 py-1">RCON {formatPort(server.rconPort)}</span>
                          <span className="rounded-full bg-panel px-2 py-1">Scanned {new Date(server.lastScannedAt).toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap justify-start gap-2 md:justify-end">
                        <button
                          type="button"
                          onClick={() => handleStart(server.id)}
                          disabled={actionBusy === `start:${server.id}`}
                          className="inline-flex h-10 items-center gap-2 rounded-full bg-accent px-4 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Power size={16} />
                          Start
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStop(server.id)}
                          disabled={actionBusy === `stop:${server.id}`}
                          className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-white px-4 text-sm font-semibold transition hover:border-accent disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Power size={16} />
                          Stop
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRestart(server.id)}
                          disabled={actionBusy === `restart:${server.id}`}
                          className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-white px-4 text-sm font-semibold transition hover:border-accent disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <RotateCcw size={16} />
                          Restart
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <aside className="rounded-3xl border border-line bg-white/90 p-4 shadow-[0_24px_70px_rgba(23,32,27,0.08)]">
            <div className="border-b border-line pb-3">
              <h2 className="text-sm font-semibold text-ink">Operations</h2>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-4">
              <Link className="flex h-24 flex-col items-center justify-center gap-2 rounded-2xl border border-line bg-panel text-sm font-medium text-ink transition hover:border-accent" href="/login">
                <Terminal size={20} />
                Login
              </Link>
              <button onClick={handleRescan} className="flex h-24 flex-col items-center justify-center gap-2 rounded-2xl border border-line bg-panel text-sm font-medium text-ink transition hover:border-accent" type="button">
                <RotateCcw size={20} />
                Rescan
              </button>
              <div className="flex h-24 flex-col items-center justify-center gap-2 rounded-2xl border border-line bg-panel text-sm font-medium text-ink/60">
                <LockKeyhole size={20} />
                Lock mode
              </div>
              <div className="flex h-24 flex-col items-center justify-center gap-2 rounded-2xl border border-line bg-panel text-sm font-medium text-ink/60">
                <Power size={20} />
                Start/Stop
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}