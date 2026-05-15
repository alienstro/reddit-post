import { NextRequest } from "next/server";

import { proxyToDjango } from "@/app/infrastructure/backend-proxy";

export async function POST(request: NextRequest) {
  return proxyToDjango("/api/auth/login/", {
    method: "POST",
    body: await request.json(),
  });
}
