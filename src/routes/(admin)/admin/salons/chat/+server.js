import { json } from "@sveltejs/kit";
import { salonRooms } from "$lib/server/state.js";
import { logAdminAction } from "$lib/server/middleware/auth.js";
import {
  supportView,
  markAdminJoined,
  sendSupportMessage,
} from "$lib/server/socket/salonSupport.js";

// Chat de support de la fiche salon. Le hook réserve /admin au cookie admin.

const codeOf = (v) => String(v ?? "").toUpperCase();

export function GET({ url }) {
  const code = codeOf(url.searchParams.get("code"));
  const salon = salonRooms[code];
  if (!salon) return json({ live: false, support: null });
  markAdminJoined(code);
  return json({ live: true, support: supportView(salon) });
}

export async function POST({ request, locals }) {
  const { code, text } = await request.json().catch(() => ({}));
  try {
    const support = sendSupportMessage(codeOf(code), "admin", text);
    await logAdminAction(
      locals.adminId,
      "salon_support_message",
      codeOf(code),
      "salon",
      { message: support.messages.at(-1).text },
    );
    return json({ support });
  } catch (e) {
    return json({ error: e.message }, { status: 400 });
  }
}
