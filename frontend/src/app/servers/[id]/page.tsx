'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  banPlayer,
  getJournal,
  getPlayers,
  getServer,
  getServerStatus,
  kickPlayer,
  pardonPlayer,
  restartServer,
  startServer,
  stopServer,
  type ServerRecord
} from '../../../lib/api';
import { sendRconCommand } from '../../../lib/ws';
import { ArrowLeft, Ban, ClipboardList, LogOut, Power, Terminal, Users } from 'lucide-react';

export default function ServerDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const serverId = decodeURIComponent(params.id);
  const [server, setServer] = useState<ServerRecord | null>(null);
  const [statusText, setStatusText] = useState('');
  const [journalText, setJournalText] = useState('');
  const [playersText, setPlayersText] = useState('');
  const [command, setCommand] = useState('list');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const [serverResult, statusResult, journalResult, playersResult] = await Promise.all([
        getServer(serverId),
        getServerStatus(serverId),
        getJournal(serverId, 100),
        getPlayers(serverId)
      ]);
      setServer(serverResult.server);
      setStatusText(`${statusResult.stdout || statusResult.stderr || `exit ${statusResult.exitCode}`}`);
      setJournalText(journalResult.output);
      setPlayersText(playersResult.output);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load server');
    }
  }

  useEffect(() => {
    void load();
  }, [serverId]);

  async function handleCommand() {
    setBusy('command');
    setError(null);
    try {
      const payload = await sendRconCommand(serverId, command);
      if (!payload.ok) {
        throw new Error(payload.message ?? 'Command failed');
      }
      setStatusText(payload.output ?? 'Command sent');
      await load();
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : 'Command failed');
    } finally {
      setBusy(null);
    }
  }

  async function handleStart() {
    setBusy('start');
    try {
      await startServer(serverId);
      await load();
    } catch (startError) {
      setError(startError instanceof Error ? startError.message : 'Start failed');
    } finally {
      setBusy(null);
    }
  }

  async function handleStop() {
    setBusy('stop');
    try {
      await stopServer(serverId);
      await load();
    } catch (stopError) {
      setError(stopError instanceof Error ? stopError.message : 'Stop failed');
    } finally {
      setBusy(null);
    }
  }

  async function handleRestart() {
    setBusy('restart');
    try {
      await restartServer(serverId);
      await load();
    } catch (restartError) {
      setError(restartError instanceof Error ? restartError.message : 'Restart failed');
    } finally {
      setBusy(null);
    }
  }

  async function handleKick(player: string) {
    setBusy(`kick:${player}`);
    try {
      await kickPlayer(serverId, player, 'Kick from dashboard');
      await load();
    } catch (kickError) {
      setError(kickError instanceof Error ? kickError.message : 'Kick failed');
    } finally {
      setBusy(null);
    }
  }

  async function handleBan(player: string) {
    setBusy(`ban:${player}`);
    try {
      await banPlayer(serverId, player, 'Ban from dashboard');
      await load();
    } catch (banError) {
      setError(banError instanceof Error ? banError.message : 'Ban failed');
    } finally {
      setBusy(null);
    }
  }

  async function handlePardon(player: string) {
    setBusy(`pardon:${player}`);
    try {
      await pardonPlayer(serverId, player);
      await load();
    } catch (pardonError) {
      setError(pardonError instanceof Error ? pardonError.message : 'Pardon failed');
    } finally {
      setBusy(null);
    }
  }

  const players = playersText
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .slice(0, 10);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(47,125,87,0.14),_transparent_35%),linear-gradient(180deg,#eef1ea_0%,#f7f8f5_100%)] text-ink">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-5 sm:px-8">
        <div className="flex items-center justify-between gap-4">
          <Link href="/servers" className="inline-flex items-center gap-2 text-sm font-medium text-ink/70 hover:text-accent">
            <ArrowLeft size={16} />
            Back to servers
          </Link>
          <div className="flex gap-2">
            <button onClick={handleStart} disabled={busy === 'start'} className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" type="button">
              <Power size={16} />
              Start
            </button>
            <button onClick={handleStop} disabled={busy === 'stop'} className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold disabled:opacity-60" type="button">
              <LogOut size={16} />
              Stop
            </button>
            <button onClick={handleRestart} disabled={busy === 'restart'} className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold disabled:opacity-60" type="button">
              <ClipboardList size={16} />
              Restart
            </button>
          </div>
        </div>

        {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-line bg-white p-5 shadow-[0_24px_70px_rgba(23,32,27,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">Server dashboard</p>
            <h1 className="mt-2 text-3xl font-semibold">{server?.displayName ?? serverId}</h1>
            <p className="mt-2 text-sm text-ink/70">{server?.path ?? 'Loading...'}</p>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl bg-panel p-4">
                <p className="text-xs font-semibold uppercase text-ink/55">Systemd unit</p>
                <p className="mt-1 text-sm font-medium">{server?.systemdUnit ?? '...'}</p>
              </div>
              <div className="rounded-2xl bg-panel p-4">
                <p className="text-xs font-semibold uppercase text-ink/55">Game port</p>
                <p className="mt-1 text-sm font-medium">{server?.gamePort ?? 'n/a'}</p>
              </div>
              <div className="rounded-2xl bg-panel p-4">
                <p className="text-xs font-semibold uppercase text-ink/55">RCON port</p>
                <p className="mt-1 text-sm font-medium">{server?.rconPort ?? 'n/a'}</p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-line bg-panel p-4">
                <div className="flex items-center gap-2 text-sm font-semibold"><ClipboardList size={16} /> Status</div>
                <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap text-xs leading-6 text-ink/80">{statusText}</pre>
              </div>
              <div className="rounded-2xl border border-line bg-panel p-4">
                <div className="flex items-center gap-2 text-sm font-semibold"><Terminal size={16} /> Journal</div>
                <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap text-xs leading-6 text-ink/80">{journalText}</pre>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-line bg-white p-5 shadow-[0_24px_70px_rgba(23,32,27,0.08)]">
            <div className="flex items-center gap-2 text-sm font-semibold"><Users size={16} /> Players</div>
            <div className="mt-4 flex flex-col gap-2">
              {players.length === 0 ? (
                <p className="text-sm text-ink/65">No player records returned by RCON yet.</p>
              ) : (
                players.map((player) => {
                  const normalized = player.trim();
                  return (
                    <div key={normalized} className="rounded-2xl border border-line bg-panel p-3 text-sm">
                      <p className="font-medium">{normalized}</p>
                      <div className="mt-2 flex gap-2">
                        <button type="button" onClick={() => handleKick(normalized)} disabled={busy === `kick:${normalized}`} className="rounded-full border border-line px-3 py-1 text-xs font-semibold disabled:opacity-60">
                          Kick
                        </button>
                        <button type="button" onClick={() => handleBan(normalized)} disabled={busy === `ban:${normalized}`} className="rounded-full border border-line px-3 py-1 text-xs font-semibold disabled:opacity-60">
                          Ban
                        </button>
                        <button type="button" onClick={() => handlePardon(normalized)} disabled={busy === `pardon:${normalized}`} className="rounded-full border border-line px-3 py-1 text-xs font-semibold disabled:opacity-60">
                          Pardon
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-5 rounded-2xl border border-line bg-panel p-4">
              <div className="flex items-center gap-2 text-sm font-semibold"><Terminal size={16} /> Console command</div>
              <textarea
                className="mt-3 min-h-24 w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none"
                value={command}
                onChange={(event) => setCommand(event.target.value)}
              />
              <button onClick={handleCommand} disabled={busy === 'command'} className="mt-3 inline-flex items-center rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" type="button">
                Run command
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}