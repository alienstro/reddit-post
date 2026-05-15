import { cookies } from "next/headers";

export const backendBaseUrl =
  process.env.DJANGO_API_BASE_URL ?? "http://localhost:8000";

export async function fetchJson<T>(
  path: string,
): Promise<{ data?: T; error?: string }> {
  try {
    const response = await fetch(`${backendBaseUrl}${path}`, {
      cache: "no-store",
    });
    const data = (await response.json()) as T;

    if (!response.ok) {
      const message =
        typeof data === "object" &&
        data !== null &&
        "error" in data &&
        typeof data.error === "string"
          ? data.error
          : `Request failed with HTTP ${response.status}.`;
      return { error: message };
    }

    return { data };
  } catch {
    return {
      error: `Django backend is unavailable at ${backendBaseUrl}.`,
    };
  }
}

export async function fetchSessionJson<T>(
  path: string,
): Promise<{ data?: T; error?: string }> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");

  try {
    const response = await fetch(`${backendBaseUrl}${path}`, {
      headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
      cache: "no-store",
    });
    const data = (await response.json()) as T;
    if (!response.ok) {
      return { error: `Request failed with HTTP ${response.status}.` };
    }
    return { data };
  } catch {
    return {
      error: `Django backend is unavailable at ${backendBaseUrl}.`,
    };
  }
}
