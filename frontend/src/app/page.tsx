import { Activity, Database, LockKeyhole, Power, RotateCcw, Server, ShieldCheck, Terminal } from 'lucide-react';

const discoveredServers: Array<{ name: string; unit: string; state: string; version: string }> = [];

const statusItems = [
  { label: 'Discovery', value: 'Ready for systemd scan', icon: Server },
  { label: 'Database', value: 'Users, sessions, audit only', icon: Database },
  { label: 'Security', value: 'RBAC and cookies planned', icon: ShieldCheck }
];

export default function Home() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-5 sm:px-8">
        <header className="flex flex-col gap-4 border-b border-line pb-5 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal text-ink">Server Control Center</h1>
            <p className="mt-1 max-w-2xl text-sm text-ink/70">
              Runtime-discovered Minecraft operations for Linux systemd hosts.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-line bg-white text-ink shadow-sm" aria-label="Open console">
              <Terminal size={18} />
            </button>
            <button className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-line bg-white text-ink shadow-sm" aria-label="Refresh discovery">
              <RotateCcw size={18} />
            </button>
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-3">
          {statusItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="rounded-md border border-line bg-panel p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase text-ink/55">{item.label}</p>
                    <p className="mt-1 text-sm font-medium text-ink">{item.value}</p>
                  </div>
                  <Icon className="text-accent" size={20} />
                </div>
              </div>
            );
          })}
        </section>

        <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="rounded-md border border-line bg-white">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 className="text-sm font-semibold text-ink">Discovered Servers</h2>
              <span className="rounded-md bg-panel px-2 py-1 text-xs text-ink/65">{discoveredServers.length} online records</span>
            </div>
            {discoveredServers.length === 0 ? (
              <div className="flex min-h-80 flex-col items-center justify-center px-6 text-center">
                <Activity className="text-accent" size={28} />
                <p className="mt-3 text-base font-medium text-ink">No runtime scan results yet</p>
                <p className="mt-1 max-w-md text-sm text-ink/65">
                  The backend scaffold is ready; the next task implements systemd inspection and server.properties validation.
                </p>
              </div>
            ) : null}
          </div>

          <aside className="rounded-md border border-line bg-white">
            <div className="border-b border-line px-4 py-3">
              <h2 className="text-sm font-semibold text-ink">Operations</h2>
            </div>
            <div className="grid grid-cols-2 gap-2 p-4">
              <button className="flex h-24 flex-col items-center justify-center gap-2 rounded-md border border-line bg-panel text-sm font-medium text-ink">
                <Power size={20} />
                Start
              </button>
              <button className="flex h-24 flex-col items-center justify-center gap-2 rounded-md border border-line bg-panel text-sm font-medium text-ink">
                <Power size={20} />
                Stop
              </button>
              <button className="flex h-24 flex-col items-center justify-center gap-2 rounded-md border border-line bg-panel text-sm font-medium text-ink">
                <RotateCcw size={20} />
                Restart
              </button>
              <button className="flex h-24 flex-col items-center justify-center gap-2 rounded-md border border-line bg-panel text-sm font-medium text-ink">
                <LockKeyhole size={20} />
                Backup
              </button>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

