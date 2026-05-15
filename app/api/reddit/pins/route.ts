import { NextRequest } from "next/server";

import { proxyToDjango } from "@/app/infrastructure/backend-proxy";

export async function GET() {
  return proxyToDjango("/api/reddit/pins/");
}

export async function POST(request: NextRequest) {
  return proxyToDjango("/api/reddit/pins/", {
    method: "POST",
    body: await request.json(),
  });
}
