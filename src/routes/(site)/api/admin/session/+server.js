import { json } from "@sveltejs/kit";
import { requireAdminToken } from "$lib/server/middleware/auth.js";
import {
  makeAdminToken,
  ADMIN_COOKIE,
  ADMIN_TTL_MS,
} from "$lib/server/maintenance.js";

// Pose le cookie signé qui ouvre les pages /admin et laisse l'admin naviguer
// sur le site pendant la maintenance.
export async function POST({ request, cookies }) {
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
  const user = await requireAdminToken(token);

  cookies.set(ADMIN_COOKIE, makeAdminToken(user.id), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: ADMIN_TTL_MS / 1000,
  });

  return json({ ok: true });
}
