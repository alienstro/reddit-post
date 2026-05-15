import { proxyToDjango } from "@/app/infrastructure/backend-proxy";

export async function POST() {
  return proxyToDjango("/api/auth/logout/", {
    method: "POST",
  });
}
