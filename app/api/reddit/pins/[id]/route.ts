import { proxyToDjango } from "@/app/infrastructure/backend-proxy";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return proxyToDjango(`/api/reddit/pins/${encodeURIComponent(id)}/`, {
    method: "DELETE",
  });
}
