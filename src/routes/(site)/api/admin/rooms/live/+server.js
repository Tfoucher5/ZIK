import { requireAdminToken } from "$lib/server/middleware/auth.js";
import {
  sseResponse,
  roomsLiveSnapshot,
} from "$lib/server/services/admin/live.js";

export async function GET({ url, request }) {
  await requireAdminToken(url.searchParams.get("token"));
  return sseResponse(request, roomsLiveSnapshot);
}
