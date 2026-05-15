"use client";

import { FormEvent, useEffect, useState, useTransition } from "react";
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

  async function ensureCsrfCookie() {
    await fetch("/api/auth/me/", { cache: "no-store" });
  }

  useEffect(() => {
    void ensureCsrfCookie();
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    await ensureCsrfCookie();

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
    await ensureCsrfCookie();
    await fetch("/api/auth/logout/", { method: "POST" });
    setAuth(anonymousState);
    setPins([]);
  }

  async function handlePin() {
    setError("");
    await ensureCsrfCookie();
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
    await ensureCsrfCookie();
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
    <section className="flex w-full flex-col gap-3 rounded-lg border border-hairline bg-surface-card p-4">
      {auth.authenticated ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-sans text-sm text-body">
              Signed in as <strong className="font-medium text-ink">{auth.user?.username}</strong>
            </span>
            <div className="flex gap-2">
              <button
                className="rounded-md border border-hairline bg-canvas px-3 py-2 font-sans text-sm font-medium text-ink transition hover:bg-surface-soft"
                onClick={handlePin}
                type="button"
              >
                {currentPinned ? "Update pin" : `Pin r/${subreddit}`}
              </button>
              <button
                className="rounded-md bg-ink px-3 py-2 font-sans text-sm font-medium text-on-dark transition hover:bg-body-strong"
                onClick={handleLogout}
                type="button"
              >
                Sign out
              </button>
            </div>
          </div>
          {pins.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {pins.map((pin) => (
                <span
                  className="inline-flex items-center overflow-hidden rounded-full border border-hairline bg-canvas font-sans text-sm"
                  key={pin.id}
                >
                  <button
                    className="px-3 py-1.5 font-medium text-body transition hover:text-primary"
                    disabled={isPending}
                    onClick={() => loadPin(pin.subreddit)}
                    type="button"
                  >
                    r/{pin.subreddit}
                  </button>
                  <button
                    aria-label={`Remove r/${pin.subreddit}`}
                    className="border-l border-hairline px-2 py-1.5 text-muted-soft transition hover:bg-error-surface hover:text-error-text"
                    onClick={() => void handleDelete(pin.id)}
                    type="button"
                  >
                    ×
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
              className="min-w-0 rounded-md border border-hairline bg-canvas px-3 py-2 font-sans text-sm text-ink outline-none placeholder:text-muted-soft transition focus:border-primary focus:ring-4 focus:ring-primary/15"
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Username"
              value={username}
            />
            <input
              className="min-w-0 rounded-md border border-hairline bg-canvas px-3 py-2 font-sans text-sm text-ink outline-none placeholder:text-muted-soft transition focus:border-primary focus:ring-4 focus:ring-primary/15"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              type="password"
              value={password}
            />
            <button
              className="rounded-md bg-ink px-4 py-2 font-sans text-sm font-medium text-on-dark transition hover:bg-body-strong"
              type="submit"
            >
              Sign in
            </button>
          </div>
          <p className="font-sans text-xs text-muted">
            Sign in with a Django account to save communities.
          </p>
        </form>
      )}
      {error ? (
        <p className="rounded-md border border-error-border bg-error-surface px-3 py-2 font-sans text-sm text-error-text">
          {error}
        </p>
      ) : null}
    </section>
  );
}
