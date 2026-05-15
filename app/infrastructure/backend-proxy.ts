import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { backendBaseUrl } from "@/app/infrastructure/django-api";

type ProxyOptions = {
  method?: string;
  body?: unknown;
};

export async function proxyToDjango(path: string, options: ProxyOptions = {}) {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");

  const response = await fetch(`${backendBaseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      ...(options.body ? { "Content-Type": "application/json" } : {}),
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

  const setCookie = response.headers.get("Set-Cookie");
  if (setCookie) {
    nextResponse.headers.set("Set-Cookie", setCookie);
  }

  return nextResponse;
}
