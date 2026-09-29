// Envoi par l'API Resend (domaine zik-music.fr déjà vérifié pour Supabase).
// Sans RESEND_API_KEY, rien n'est envoyé : l'appelant n'échoue pas pour autant.
const FROM = "ZIK <theo@zik-music.fr>";
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "theo@zik-music.fr";

export async function sendMail({ to, subject, html, text, replyTo }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn(`[mail] RESEND_API_KEY absente, « ${subject} » non envoyé`);
    return false;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to: [to],
      reply_to: replyTo ?? "theo@zik-music.fr",
      subject,
      html,
      text,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    console.error(`[mail] Resend ${res.status} :`, await res.text());
    return false;
  }
  return true;
}
