"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { AuthState, Pin, PinsResponse } from "@/app/domain/auth";

const anonymousState: AuthState = {
  authenticated: false,
  user: null,
};

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export function CommunityPins({
  subreddit,
  initialAuth,
  initialPins = [],
}: {
  subreddit: string;
  initialAuth: AuthState;
  initialPins?: Pin[];
}) {
  const router = useRouter();
  const [auth, setAuth] = useState<AuthState>(initialAuth);
  const [pins, setPins] = useState<Pin[]>(Array.isArray(initialPins) ? initialPins : []);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  async function refreshSession() {
    const authResponse = await fetch("/api/auth/me/", { cache: "no-store" });
    const nextAuth = await readJson<AuthState>(authResponse);
    setAuth(nextAuth);

    if (nextAuth.authenticated) {
      const pinsResponse = await fetch("/api/reddit/pins/", { cache: "no-store" });
      const pinsPayload = await readJson<PinsResponse>(pinsResponse);
      setPins(pinsPayload.pins ?? []);
    } else {
      setPins([]);
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const response = await fetch("/api/auth/login/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const payload = await readJson<AuthState & { error?: string }>(response);

    if (!response.ok) {
      setError(payload.error ?? "Login failed.");
      return;
    }

    setAuth(payload);
    setUsername("");
    setPassword("");
    await refreshSession();
  }

  async function handleLogout() {
    setError("");
    await fetch("/api/auth/logout/", { method: "POST" });
    setAuth(anonymousState);
    setPins([]);
  }

  async function handlePin() {
    setError("");
    const response = await fetch("/api/reddit/pins/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subreddit }),
    });
    const payload = await readJson<{ pin?: Pin; error?: string }>(response);

    if (!response.ok || !payload.pin) {
      setError(payload.error ?? "Could not pin community.");
      return;
    }

    await refreshSession();
  }

  async function handleDelete(pinId: number) {
    setError("");
    const response = await fetch(`/api/reddit/pins/${pinId}/`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const payload = await readJson<{ error?: string }>(response);
      setError(payload.error ?? "Could not remove pin.");
      return;
    }

    setPins((currentPins) => currentPins.filter((pin) => pin.id !== pinId));
  }

  function loadPin(nextSubreddit: string) {
    startTransition(() => {
      router.push(`/?subreddit=${encodeURIComponent(nextSubreddit)}`);
    });
  }

  const currentPinned = pins.some(
    (pin) => pin.subreddit_lower === subreddit.toLowerCase(),
  );

  return (
    <section className="flex w-full flex-col gap-3 rounded-md border border-zinc-200 bg-white p-4">
      {auth.authenticated ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm text-zinc-700">
              Logged in as <strong>{auth.user?.username}</strong>
            </span>
            <div className="flex gap-2">
              <button
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50"
                onClick={handlePin}
                type="button"
              >
                {currentPinned ? "Update pin" : `Pin r/${subreddit}`}
              </button>
              <button
                className="rounded-md bg-zinc-950 px-3 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
                onClick={handleLogout}
                type="button"
              >
                Log out
              </button>
            </div>
          </div>
          {pins.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {pins.map((pin) => (
                <span
                  className="inline-flex items-center overflow-hidden rounded-md border border-zinc-300 bg-stone-50 text-sm"
                  key={pin.id}
                >
                  <button
                    className="px-3 py-1.5 font-medium text-zinc-800 hover:text-rose-700"
                    disabled={isPending}
                    onClick={() => loadPin(pin.subreddit)}
                    type="button"
                  >
                    r/{pin.subreddit}
                  </button>
                  <button
                    aria-label={`Remove r/${pin.subreddit}`}
                    className="border-l border-zinc-300 px-2 py-1.5 text-zinc-500 hover:bg-red-50 hover:text-red-700"
                    onClick={() => void handleDelete(pin.id)}
                    type="button"
                  >
                    x
                  </button>
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : (
        <form className="flex flex-col gap-3" onSubmit={handleLogin}>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <input
              className="min-w-0 rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none ring-rose-700/20 focus:border-rose-700 focus:ring-4"
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Username"
              value={username}
            />
            <input
              className="min-w-0 rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none ring-rose-700/20 focus:border-rose-700 focus:ring-4"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              type="password"
              value={password}
            />
            <button
              className="rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
              type="submit"
            >
              Log in
            </button>
          </div>
          <p className="text-sm text-zinc-600">
            Log in with a Django user account to manage saved communities.
          </p>
        </form>
      )}
      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          {error}
        </p>
      ) : null}
    </section>
  );
}
