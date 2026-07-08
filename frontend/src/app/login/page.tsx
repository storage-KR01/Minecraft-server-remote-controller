'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { login } from '../../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      await login(username, password);
      router.push('/servers');
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(47,125,87,0.16),_transparent_35%),linear-gradient(180deg,#eef1ea_0%,#f7f8f5_100%)] px-5 py-10 text-ink sm:px-8">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 rounded-3xl border border-line bg-white/80 p-6 shadow-[0_24px_80px_rgba(23,32,27,0.12)] backdrop-blur">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">Server Control Center</p>
          <h1 className="mt-3 text-3xl font-semibold">Sign in</h1>
          <p className="mt-2 text-sm text-ink/70">Use the session cookie backed by the NestJS backend.</p>
        </div>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Username
            <input
              className="rounded-xl border border-line bg-panel px-4 py-3 outline-none transition focus:border-accent"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-medium">
            Password
            <input
              type="password"
              className="rounded-xl border border-line bg-panel px-4 py-3 outline-none transition focus:border-accent"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
          </label>

          {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}

          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center justify-center rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  );
}