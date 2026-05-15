import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { backendBaseUrl } from "@/app/infrastructure/django-api";

type ProxyOptions = {
  method?: string;
  body?: unknown;
};

function getSetCookies(headers: Headers) {
  const withGetSetCookie = headers as Headers & {
    getSetCookie?: () => string[];
  };
  const setCookies = withGetSetCookie.getSetCookie?.();
  if (setCookies?.length) {
    return setCookies;
  }

  const setCookie = headers.get("Set-Cookie");
  return setCookie ? [setCookie] : [];
}

export async function proxyToDjango(path: string, options: ProxyOptions = {}) {
  const cookieStore = await cookies();
  const csrfToken = cookieStore.get("csrftoken")?.value;
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");

  const response = await fetch(`${backendBaseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(csrfToken ? { "X-CSRFToken": csrfToken } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  const text = await response.text();
  const nextResponse = new NextResponse(text, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("Content-Type") ?? "application/json",
    },
  });

  for (const setCookie of getSetCookies(response.headers)) {
    nextResponse.headers.append("Set-Cookie", setCookie);
  }

  return nextResponse;
}
