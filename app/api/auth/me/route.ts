import { proxyToDjango } from "@/app/infrastructure/backend-proxy";

export async function GET() {
  return proxyToDjango("/api/auth/me/");
}
